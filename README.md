# PebbleSky - BlueSky for Pebble

PebbleSky is a Pebble watchapp that brings the BlueSky social network to your wrist. It allows you to view your timeline, like posts, repost, and save posts directly from your Pebble smartwatch.

## Features

- **Timeline**: View your BlueSky feed on your watch.
- **Detailed View**: Read full posts and see author details.
- **Actions**:
  - **Like**: Like posts directly from the watch.
  - **Repost**: Repost content to your followers.
  - **Reply**: View reply counts (reply composition is a placeholder).
  - **Save**: Save posts for later reading.
- **Real-time Updates**: Actions are reflected immediately in the UI.

## Building and Installation

This project is built using the standard Pebble SDK.

1.  **Install the Pebble SDK**: Follow the instructions at [developer.repebble.com](https://developer.repebble.com/docs/).
2.  **Build the project**:
    ```bash
    pebble build
    ```
3.  **Install on your watch**:
    ```bash
    pebble install --phone <PHONE_IP>
    ```

## Development Status

This is a prototype implementation. 
-   **Authentication**: Currently mocked. In a production version, this would use PebbleKit JS configuration page for OAuth login.
-   **API Integration**: The `src/pkjs/index.js` file contains placeholders for actual BlueSky API calls (AT Protocol).
-   **UI**: Implements the official Pebble design guidelines using `MenuLayer`, `ActionMenu`, and `ScrollLayer`.

## Project Structure

-   `src/c/main.c`: The main C watchapp logic handling UI and AppMessage communication.
-   `src/pkjs/index.js`: The JavaScript component running on the phone, handling network requests to BlueSky.
-   `appinfo.json`: Project configuration and resources.
