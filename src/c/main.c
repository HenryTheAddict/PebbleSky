#include <pebble.h>

static Window *s_main_window;
static MenuLayer *s_menu_layer;

// Detail Window
static Window *s_detail_window;
static ScrollLayer *s_detail_scroll_layer;
static TextLayer *s_detail_text_layer;
static TextLayer *s_detail_author_layer;
static TextLayer *s_detail_stats_layer;

// Action Menu
static ActionMenu *s_action_menu;
static ActionMenuLevel *s_root_level;

// Data
static char s_post_buffer[256];
static char s_author_buffer[64];
static int s_likes_count = 0;
static int s_reposts_count = 0;
static int s_reply_count = 0;
static char s_post_uri[128];
static char s_post_cid[128];
static char s_stats_buffer[64];

// Forward declarations
static void send_action(const char* action, const char* post_uri, const char* post_cid);

// --- Action Menu ---

static void action_performed_callback(ActionMenu *action_menu, const ActionMenuItem *action, void *context) {
  const char *type = (const char *)action_menu_item_get_action_data(action);
  APP_LOG(APP_LOG_LEVEL_INFO, "Action performed: %s", type);
  send_action(type, s_post_uri, s_post_cid);
}

static void init_action_menu() {
  s_root_level = action_menu_level_create(4);

  action_menu_level_add_action(s_root_level, "Like", action_performed_callback, (void *)"like");
  action_menu_level_add_action(s_root_level, "Repost", action_performed_callback, (void *)"repost");
  action_menu_level_add_action(s_root_level, "Replies", action_performed_callback, (void *)"replies");
  action_menu_level_add_action(s_root_level, "Save", action_performed_callback, (void *)"save");
}

static void show_action_menu(Window *window) {
  if (!s_root_level) {
    init_action_menu();
  }
  
  ActionMenuConfig config = (ActionMenuConfig) {
    .root_level = s_root_level,
    .colors = {
      .background = GColorWhite,
      .foreground = GColorBlack,
    },
    .align = ActionMenuAlignCenter
  };

  s_action_menu = action_menu_open(&config);
}

// --- Detail Window ---

static void detail_window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  s_detail_scroll_layer = scroll_layer_create(bounds);
  scroll_layer_set_click_config_onto_window(s_detail_scroll_layer, window);

  // Author
  s_detail_author_layer = text_layer_create(GRect(5, 5, bounds.size.w - 10, 30));
  text_layer_set_font(s_detail_author_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text(s_detail_author_layer, s_author_buffer);
  scroll_layer_add_child(s_detail_scroll_layer, text_layer_get_layer(s_detail_author_layer));

  // Content
  // GSize max_size = text_layer_get_content_size(text_layer_create(GRect(0, 0, bounds.size.w - 10, 2000))); // Dummy for calculation
  s_detail_text_layer = text_layer_create(GRect(5, 40, bounds.size.w - 10, 200)); // Initial size, will resize
  text_layer_set_font(s_detail_text_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24));
  text_layer_set_text(s_detail_text_layer, s_post_buffer);
  
  // Resize height based on text
  GSize content_size = text_layer_get_content_size(s_detail_text_layer);
  layer_set_frame(text_layer_get_layer(s_detail_text_layer), GRect(5, 40, bounds.size.w - 10, content_size.h));
  scroll_layer_add_child(s_detail_scroll_layer, text_layer_get_layer(s_detail_text_layer));

  // Stats
  snprintf(s_stats_buffer, sizeof(s_stats_buffer), "%dL %dR %dRep", s_likes_count, s_reposts_count, s_reply_count);
  s_detail_stats_layer = text_layer_create(GRect(5, 40 + content_size.h + 5, bounds.size.w - 10, 20));
  text_layer_set_font(s_detail_stats_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18));
  text_layer_set_text(s_detail_stats_layer, s_stats_buffer);
  scroll_layer_add_child(s_detail_scroll_layer, text_layer_get_layer(s_detail_stats_layer));

  // Update scroll content size
  scroll_layer_set_content_size(s_detail_scroll_layer, GSize(bounds.size.w, 40 + content_size.h + 30));
  
  layer_add_child(window_layer, scroll_layer_get_layer(s_detail_scroll_layer));
}

static void detail_window_unload(Window *window) {
  text_layer_destroy(s_detail_author_layer);
  text_layer_destroy(s_detail_text_layer);
  text_layer_destroy(s_detail_stats_layer);
  scroll_layer_destroy(s_detail_scroll_layer);
}

static void detail_click_config_provider(void *context) {
    // Single click select to open action menu
    window_single_click_subscribe(BUTTON_ID_SELECT, (ClickHandler)show_action_menu);
}

static void show_detail_window() {
  if(!s_detail_window) {
    s_detail_window = window_create();
    window_set_window_handlers(s_detail_window, (WindowHandlers) {
      .load = detail_window_load,
      .unload = detail_window_unload
    });
    window_set_click_config_provider(s_detail_window, detail_click_config_provider);
  }
  window_stack_push(s_detail_window, true);
}


// --- AppMessage ---

static void send_action(const char* action, const char* post_uri, const char* post_cid) {
  DictionaryIterator *out_iter;
  AppMessageResult result = app_message_outbox_begin(&out_iter);
  if(result == APP_MSG_OK) {
    dict_write_cstring(out_iter, MESSAGE_KEY_action_type, action);
    dict_write_cstring(out_iter, MESSAGE_KEY_post_id, post_uri);
    dict_write_cstring(out_iter, MESSAGE_KEY_post_cid, post_cid);
    app_message_outbox_send();
  } else {
    APP_LOG(APP_LOG_LEVEL_ERROR, "Error preparing outbox: %d", (int)result);
  }
}

static void inbox_received_callback(DictionaryIterator *iterator, void *context) {
  Tuple *status_tuple = dict_find(iterator, MESSAGE_KEY_status);
  Tuple *message_tuple = dict_find(iterator, MESSAGE_KEY_message);
  Tuple *post_uri_tuple = dict_find(iterator, MESSAGE_KEY_post_id);
  Tuple *post_cid_tuple = dict_find(iterator, MESSAGE_KEY_post_cid);
  Tuple *author_tuple = dict_find(iterator, MESSAGE_KEY_author_handle);
  Tuple *content_tuple = dict_find(iterator, MESSAGE_KEY_post_content);
  Tuple *likes_tuple = dict_find(iterator, MESSAGE_KEY_likes_count);
  Tuple *reposts_tuple = dict_find(iterator, MESSAGE_KEY_reposts_count);
  Tuple *replies_tuple = dict_find(iterator, MESSAGE_KEY_reply_count);

  if (status_tuple) {
    APP_LOG(APP_LOG_LEVEL_INFO, "Status: %d", (int)status_tuple->value->int32);
  }
  if (message_tuple) {
    APP_LOG(APP_LOG_LEVEL_INFO, "Message: %s", message_tuple->value->cstring);
  }
  if (post_uri_tuple) {
    snprintf(s_post_uri, sizeof(s_post_uri), "%s", post_uri_tuple->value->cstring);
  }
  if (post_cid_tuple) {
    snprintf(s_post_cid, sizeof(s_post_cid), "%s", post_cid_tuple->value->cstring);
  }
  if (author_tuple) {
    snprintf(s_author_buffer, sizeof(s_author_buffer), "%s", author_tuple->value->cstring);
  }
  if (content_tuple) {
    snprintf(s_post_buffer, sizeof(s_post_buffer), "%s", content_tuple->value->cstring);
  }
  if (likes_tuple) {
    s_likes_count = (int)likes_tuple->value->int32;
  }
  if (reposts_tuple) {
    s_reposts_count = (int)reposts_tuple->value->int32;
  }
  if (replies_tuple) {
    s_reply_count = (int)replies_tuple->value->int32;
  }
  if (message_tuple && !content_tuple) {
    snprintf(s_author_buffer, sizeof(s_author_buffer), "%s", "PebbleSky");
    snprintf(s_post_buffer, sizeof(s_post_buffer), "%s", message_tuple->value->cstring);
  }
  
  if(s_menu_layer) {
      menu_layer_reload_data(s_menu_layer);
  }

  if (s_detail_window && window_is_loaded(s_detail_window)) {
      snprintf(s_stats_buffer, sizeof(s_stats_buffer), "%dL %dR %dRep", s_likes_count, s_reposts_count, s_reply_count);
      if (s_detail_author_layer) {
        text_layer_set_text(s_detail_author_layer, s_author_buffer);
      }
      if (s_detail_text_layer) {
        text_layer_set_text(s_detail_text_layer, s_post_buffer);
      }
      if(s_detail_stats_layer) {
          text_layer_set_text(s_detail_stats_layer, s_stats_buffer);
      }
  }
}

static void inbox_dropped_callback(AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_ERROR, "Message dropped!");
}

static void outbox_failed_callback(DictionaryIterator *iterator, AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_ERROR, "Outbox send failed!");
}

static void outbox_sent_callback(DictionaryIterator *iterator, void *context) {
  APP_LOG(APP_LOG_LEVEL_INFO, "Outbox send success!");
}

// --- Main Window ---

static uint16_t menu_get_num_rows_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {
  return 1; 
}

static void menu_draw_row_callback(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
  menu_cell_basic_draw(ctx, cell_layer, s_author_buffer, s_post_buffer, NULL);
}

static void menu_select_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
  show_detail_window();
}

static void main_window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  s_menu_layer = menu_layer_create(bounds);
  menu_layer_set_callbacks(s_menu_layer, NULL, (MenuLayerCallbacks){
    .get_num_rows = menu_get_num_rows_callback,
    .draw_row = menu_draw_row_callback,
    .select_click = menu_select_callback,
  });

  menu_layer_set_click_config_onto_window(s_menu_layer, window);
  layer_add_child(window_layer, menu_layer_get_layer(s_menu_layer));
}

static void main_window_unload(Window *window) {
  menu_layer_destroy(s_menu_layer);
}

static void init() {
  s_main_window = window_create();
  window_set_window_handlers(s_main_window, (WindowHandlers) {
    .load = main_window_load,
    .unload = main_window_unload
  });
  window_stack_push(s_main_window, true);

  app_message_register_inbox_received(inbox_received_callback);
  app_message_register_inbox_dropped(inbox_dropped_callback);
  app_message_register_outbox_failed(outbox_failed_callback);
  app_message_register_outbox_sent(outbox_sent_callback);

  app_message_open(1024, 1024);
}

static void deinit() {
  window_destroy(s_main_window);
  if(s_detail_window) window_destroy(s_detail_window);
  if(s_root_level) action_menu_hierarchy_destroy(s_root_level, NULL, NULL);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}
