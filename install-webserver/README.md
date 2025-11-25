# install-webserver

this is the server that runs on https://slack-plugin-thingy.hackclub.cc/ \

## setup

- create a .env file with the following variables:
  - `SERVER_URL`: the URL of the server (e.g. `https://slack-plugin-thingy.hackclub.cc/`)
  - `PORT`: the port to run the server on (e.g. `30000`)

- run `go install` to install dependencies
- run `cd ../app-src && sh build.sh` + `cd ../installer && sh build.sh` to build the assets
- run `go build .` to build the server
- run `./install-webserver` to start the server

## thingies

// will make it better, hopefully
// prs!
