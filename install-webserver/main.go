package main

import (
	"log"
	"net/http"
	"os"
	"regexp"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
)

func main() {
	// chi server to serve all of the required files + the installer

	godotenv.Load()
	serverUrl := os.Getenv("SERVER_URL")
	r := chi.NewRouter()

	r.Use(middleware.Logger)

	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		file := r.URL.Path[1:]
		if file == "" {
			file = "index.html"
		}
		// if file is a .sh, inject SERVER_URL=serverUrl

		if len(file) > 3 && file[len(file)-3:] == ".sh" {
			w.Header().Set("Content-Type", "application/x-sh")
			scriptContent, err := os.ReadFile("./assets/" + file)
			if err != nil {
				http.NotFound(w, r)
				return
			}
			script := string(scriptContent)

			// find the SERVER_URL="" with regex and replace it
			script = regexp.MustCompile(`SERVER_URL=".*"`).ReplaceAllString(script, `SERVER_URL="`+serverUrl+`"`)

			w.Write([]byte(script))
			return
		}
		http.ServeFile(w, r, "./assets/"+file)
	})

	log.Println("Starting web server on :8080")
	err := http.ListenAndServe(":8080", r)
	if err != nil {
		log.Fatal(err)
	}
}
