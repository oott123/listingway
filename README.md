<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./promote/dark.webp" type="image/webp">
  <source media="(prefers-color-scheme: dark)" srcset="./promote/dark.png" type="image/png">
  <source media="(prefers-color-scheme: light)" srcset="./promote/light.webp" type="image/webp">
  <source media="(prefers-color-scheme: light)" srcset="./promote/light.png" type="image/png">
  <img alt="Screenshot of listingway showing its light and clean user interface." src="./promote/light.png">
</picture>

# listingway

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

## Config

Create a `config.json` under `listingway` folder with the following content:

```json
{
  "prefixes": ["http://localhost:8081", "http://127.0.0.1:8081"],
  "chunkSize": 1048576,
  "concurrent": 4
}
```

You can also use the `respond` directive in your Caddyfile:

```caddy
respond /_listingway/config.json <<CONFIG
  { "chunkSize": 1048576, "concurrent": 4 }
CONFIG 200
```

All fields can be omitted if you don't need it.

### `chunkSize`

File will be download as chunks split by this size in bytes.

### `concurrent`

Concurrent requests for download a single file.

### `prefixes`

If given, file will be downloaded from this list of prefix. The origin of the listing page will be replaced by the prefix given. Remember to include the prefix you used to serve the listing page if you want.

If multiple prefixes are given, workers will select one of them round-robin.

This is useful to bypass the h2 multiplexing since browser will not multiplexing connections to different domains.

CORS must be enabled while using this option. Sample config below:

```caddy
header {
  Access-Control-Allow-Origin "*"
  Access-Control-Allow-Methods "GET, OPTIONS"
  Access-Control-Allow-Headers "Range"
  Access-Control-Expose-Headers "Content-Range"
}
```

## FAQ

### No "Accelerated Download" button is shown

You will only see the "Accelerated Download" button in [supported browsers](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker#browser_compatibility) and under a [secure context](https://www.w3.org/TR/secure-contexts/).

This means **HTTP** origins are not supported (use **HTTPS**!), except when accessing from localhost.

Please note that **Safari is currently not supported** due to the lack of the [`createWritable`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable) API, although it's possible to use the sync handle API, but I don't have any time on it.

### I'm not getting faster downloads

This is common if you are using HTTP/2 on your web server.

Browsers like Chrome use multiplexing with this protocol, which results in no performance improvement.

Consider disabling HTTP/2 on your download server or setup multiple prefixes with different domains.
