# listingway

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./promote/dark.webp" type="image/webp">
  <source media="(prefers-color-scheme: dark)" srcset="./promote/dark.png" type="image/png">
  <source media="(prefers-color-scheme: light)" srcset="./promote/light.webp" type="image/webp">
  <source media="(prefers-color-scheme: light)" srcset="./promote/light.png" type="image/png">
  <img alt="Screenshot of listingway showing its light and clean user interface." src="./promote/light.png">
</picture>

Listingway is a [caddy file server browse template](https://caddyserver.com/docs/caddyfile/directives/file_server) that provides a light and clean user interface. It also includes a parallel downloader that can accelerate download speeds under certain network conditions.

[Try a live demo](https://oott123.github.io/listingway/) now! (Note: This statically generated demo may not provide the full experience of running under Caddy.)

## Features

- Dark mode / Light mode
- Parallel downloader
- Fully self-contained, no CDN resources

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./promote/dark_dialog.webp" type="image/webp">
  <source media="(prefers-color-scheme: dark)" srcset="./promote/dark_dialog.png" type="image/png">
  <source media="(prefers-color-scheme: light)" srcset="./promote/light_dialog.webp" type="image/webp">
  <source media="(prefers-color-scheme: light)" srcset="./promote/light_dialog.png" type="image/png">
  <img alt="Screenshot of listingway showing the download dialog." src="./promote/light.png">
</picture>

## Usage

Download the bundle from [releases](https://github.com/oott123/listingway/releases/latest) and upload it to your server. Then add the configuration below:

```caddy
file_server {
  root /usr/share/nginx/html
  browse /usr/share/nginx/listingway/index.html
}
handle /_listingway/assets/* {
  uri strip_prefix /_listingway/assets
  root /usr/share/nginx/listingway/assets
  file_server
}
```

Note that you should not change the `_listingway/assets` part in the `handle` and `uri` directives, unless you build your own bundle.

## FAQ

### No "Accelerated Download" button is shown

You will only see the **Accelerated Download** button in [supported browsers](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker#browser_compatibility) and under a [secure context](https://www.w3.org/TR/secure-contexts/).

This means **http** origins are not supported (use **https**!), except when accessing from localhost.

Please note that Safari is currently not supported due to the lack of the [`createWritable`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable) API.

### I'm not getting faster downloads!

This is common if you are using HTTP/2 on your web server. Browsers like Chrome use multiplexing with this protocol, which results in no performance improvement. Consider disabling HTTP/2 on your download server.
