package main

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"runtime"

	"github.com/charmbracelet/lipgloss"
)

var web_server_url = os.Getenv("SERVER_URL")

const slack_download_url = "https://downloads.slack-edge.com/desktop-releases/mac/universal/4.47.65/Slack-4.47.65-macOS.dmg"

// slack modded installer
// only macos export for now :(

//---
// style definitions
//---

var mainTitleStyle = lipgloss.NewStyle().
	Bold(true).
	Border(lipgloss.NormalBorder()).
	Padding(1, 2).Margin(1, 0).
	Foreground(lipgloss.Color("5")).
	Align(lipgloss.Center)

var subtitleStyle = lipgloss.NewStyle().
	Italic(true).
	Foreground(lipgloss.Color("8")).
	Align(lipgloss.Center)

var textStyle = lipgloss.NewStyle().
	Foreground(lipgloss.Color("7")).
	Align(lipgloss.Left)

var successStyle = lipgloss.NewStyle().
	Foreground(lipgloss.Color("10")).
	Bold(true)

var errorStyle = lipgloss.NewStyle().
	Foreground(lipgloss.Color("9")).
	Bold(true)

//---

func main() {
	if web_server_url == "" {
		web_server_url = "http://localhost:8080"
	}
	// check if first arg is "update"
	if len(os.Args) > 1 && os.Args[1] == "update" {
		update()
		return
	}
	fmt.Println(mainTitleStyle.Render("slack plugin thingy installer "))

	// check what os we are os

	fmt.Println(subtitleStyle.Render("detecting operating system..."))

	os := runtime.GOOS
	switch os {
	case "darwin":

		fmt.Println(successStyle.Render("your os is supported!"))
		MacOSInstall()
	default:
		fmt.Println(errorStyle.Render("unsupported operating system: " + os))
	}
}

func MacOSInstall() {

	removeCmd := "rm -rf /tmp/slackplugin/"
	err := execCommand(removeCmd)
	if err != nil {
		fmt.Println(errorStyle.Render("failed to clear temporary directory: " + err.Error()))
		return
	}

	fmt.Println(textStyle.Render("creating temporary directory..."))
	tempDir := "/tmp/slackplugin"
	err = os.MkdirAll(tempDir, 0755)
	if err != nil {
		fmt.Println(errorStyle.Render("failed to create temporary directory: " + err.Error()))
		return
	}
	fmt.Println(successStyle.Render("temporary directory created at " + tempDir))
	// clearing out the temp dir

	// downloading slack dmg + mounting it + copying the app to the temp dir

	fmt.Println(textStyle.Render("downloading Slack dmg..."))
	dmgPath := tempDir + "/slack.dmg"
	out, err := os.Create(dmgPath)
	if err != nil {
		fmt.Println(errorStyle.Render("failed to create dmg file: " + err.Error()))
		return
	}
	defer out.Close()

	resp, err := http.Get(slack_download_url)
	if err != nil {
		fmt.Println(errorStyle.Render("failed to download slack dmg: " + err.Error()))
		return
	}
	defer resp.Body.Close()

	_, err = io.Copy(out, resp.Body)
	if err != nil {
		fmt.Println(errorStyle.Render("failed to save slack dmg: " + err.Error()))
		return
	}
	fmt.Println(successStyle.Render("slack dmg downloaded!"))

	fmt.Println(textStyle.Render("mounting Slack dmg..."))
	mountCmd := exec.Command("hdiutil", "attach", dmgPath, "-nobrowse", "-quiet", "-mountpoint", tempDir+"/mnt")
	err = mountCmd.Run()
	if err != nil {
		fmt.Println(errorStyle.Render("failed to mount slack dmg: " + err.Error()))
		return
	}
	fmt.Println(successStyle.Render("slack dmg mounted!"))

	fmt.Println(textStyle.Render("copying Slack.app to temporary directory..."))
	copyCmd := exec.Command("cp", "-R", tempDir+"/mnt/Slack.app", tempDir+"/Slack.app")
	err = copyCmd.Run()
	if err != nil {
		fmt.Println(errorStyle.Render("failed to copy Slack.app: " + err.Error()))
		return
	}
	fmt.Println(successStyle.Render("Slack.app copied to temporary directory!"))

	fmt.Println(textStyle.Render("unmounting Slack dmg..."))
	unmountCmd := exec.Command("hdiutil", "detach", tempDir+"/mnt", "-quiet")
	err = unmountCmd.Run()
	if err != nil {
		fmt.Println(errorStyle.Render("failed to unmount slack dmg: " + err.Error()))
		return
	}
	fmt.Println(successStyle.Render("Slack dmg unmounted!"))

	// check if bun/npm is installed

	fmt.Println(textStyle.Render("checking if a javascript runtime is installed..."))
	javascriptRuntime := ""
	_, err = exec.LookPath("bun")
	if err != nil {
		_, err = exec.LookPath("npm")
		if err != nil {
			fmt.Println(errorStyle.Render("no javascript runtime found. please install bun or npm!"))
			return
		} else {
			javascriptRuntime = "npx"
			fmt.Println(successStyle.Render("npm found!"))
		}
	} else {
		fmt.Println(successStyle.Render("bun found!"))
		javascriptRuntime = "bunx"
	}

	// unpack the asar file
	asar_filename := "app.asar"

	fmt.Println(textStyle.Render("unpacking asar file..."))
	command := javascriptRuntime + " asar extract \"" + tempDir + "/Slack.app/Contents/Resources/" + asar_filename + "\" \"" + tempDir + "/asar_unpacked\""
	fmt.Println(subtitleStyle.Render("running : " + command))
	err = exec.Command("bash", "-c", command).Run()
	if err != nil {
		fmt.Println(errorStyle.Render("failed to unpack asar file: " + err.Error()))
		return
	}
	fmt.Println(successStyle.Render("asar file unpacked!"))

	// download the loader script

	resp, err = http.Get(web_server_url + "/inject.js")
	if err != nil {
		fmt.Println(errorStyle.Render("failed to download loader script: " + err.Error()))
		return
	}
	defer resp.Body.Close()

	loaderScriptPath := tempDir + "/inject.js"
	outFile, err := os.Create(loaderScriptPath)

	if err != nil {
		fmt.Println(errorStyle.Render("failed to create loader script file: " + err.Error()))
		return
	}
	defer outFile.Close()

	if _, err := io.Copy(outFile, resp.Body); err != nil {
		fmt.Println("failed to save loader script: " + err.Error())
		return
	}

	injectedCodeBytes, err := os.ReadFile(loaderScriptPath)
	if err != nil {
		fmt.Println("failed to read downloaded script: " + err.Error())
		return
	}

	targetFilePath := tempDir + "/asar_unpacked/index.js"

	targetFileContent, err := os.ReadFile(targetFilePath)
	if err != nil {
		fmt.Println("failed to read target file: " + err.Error())
		return
	}

	// remove require(process._archPath); from the original file

	re := regexp.MustCompile(`\s*require\(process\._archPath\);\s*`)
	targetFileContent = re.ReplaceAll(targetFileContent, []byte(""))

	// inject the inject.js code at the end of the file

	modifiedContent := append(targetFileContent, []byte("\n// injected code below\n")...)
	modifiedContent = append(modifiedContent, injectedCodeBytes...)

	// write back the modified content

	err = os.WriteFile(targetFilePath, modifiedContent, 0644)
	if err != nil {
		fmt.Println("failed to write modified content back to target file: " + err.Error())
		return
	}

	fmt.Println(successStyle.Render("loader script injected into preload.bundle.js!"))

	// inject the new icon, replace the electron.icns file by one downloaded from the server

	fmt.Println(textStyle.Render("injecting new icon..."))
	iconResp, err := http.Get(web_server_url + "/electron.icns")
	if err != nil {
		fmt.Println(errorStyle.Render("failed to download new icon: " + err.Error()))
		return
	}
	defer iconResp.Body.Close()

	iconPath := tempDir + "/Slack.app/Contents/Resources/electron.icns"
	iconOutFile, err := os.Create(iconPath)

	if err != nil {
		fmt.Println(errorStyle.Render("failed to create icon file: " + err.Error()))
		return
	}
	defer iconOutFile.Close()

	if _, err := io.Copy(iconOutFile, iconResp.Body); err != nil {
		fmt.Println("failed to save new icon: " + err.Error())
		return
	}

	fmt.Println(successStyle.Render("icon injected!"))

	// repack the asar file

	fmt.Println(textStyle.Render("repacking asar file..."))
	command = javascriptRuntime + " asar pack \"" + tempDir + "/asar_unpacked\" \"" + tempDir + "/Slack.app/Contents/Resources/" + asar_filename + "\""
	fmt.Println(subtitleStyle.Render("running : " + command))
	err = exec.Command("bash", "-c", command).Run()
	if err != nil {
		fmt.Println(errorStyle.Render("failed to repack asar file: " + err.Error()))
		return
	}
	fmt.Println(successStyle.Render("asar file repacked!"))

	// codesign the app to avoid macos blocking it later
	fmt.Println(textStyle.Render("codesigning the modified app..."))
	codesignCmd := exec.Command("codesign", "--force", "--deep", "--sign", "-", tempDir+"/Slack.app/Contents/MacOS/Slack")
	err = codesignCmd.Run()
	if err != nil {
		fmt.Println(errorStyle.Render("failed to codesign the app: " + err.Error()))
		return
	}
	fmt.Println(successStyle.Render("app codesigned!"))

	var oldHash string
	var newHash string

	// change the hashes of the asar files to avoid integrity checks
	// get the old/new ones by running the slack binary and checking the <2 stderr output
	for {
		fmt.Println(textStyle.Render("bypassing asar integrity checks..."))

		cmd := exec.Command(tempDir + "/Slack.app/Contents/MacOS/Slack")

		// capture stderr
		stderr, err := cmd.StderrPipe()
		if err != nil {
			fmt.Println(errorStyle.Render("failed to get stderr pipe: " + err.Error()))
			return
		}

		if err := cmd.Start(); err != nil {
			fmt.Println(errorStyle.Render("Slack failed to start: " + err.Error()))
			return
		}

		re := regexp.MustCompile(`Integrity check failed for asar archive \(([0-9a-f]{64})\ vs\ ([0-9a-f]{64})\)`)

		scanner := bufio.NewScanner(stderr)
		found := false

		for scanner.Scan() {
			line := scanner.Text()

			if match := re.FindStringSubmatch(line); match != nil {
				oldHash = match[1]
				newHash = match[2]
				fmt.Println(successStyle.Render("captured hashes!"))
				fmt.Println(textStyle.Render("old hash: " + oldHash))
				fmt.Println(textStyle.Render("new hash: " + newHash))
				found = true
				break
			}
		}

		// close process
		cmd.Process.Kill()
		cmd.Wait()

		// CASE 1 — hashes captured → break loop
		if found {
			break
		}

		// CASE 2 — no hashes, Slack was probably blocked by Gatekeeper
		fmt.Println(errorStyle.Render("Slack was blocked by macOS Gatekeeper."))
		fmt.Println(textStyle.Render(`
Please do the following:

1. Open System Settings
2. Go to Privacy & Security
3. Scroll to the bottom
4. Click "Open Anyway" for Slack
5. Then come back and press ENTER to retry.
`))

		// wait for user
		bufio.NewReader(os.Stdin).ReadBytes('\n')

		fmt.Println(textStyle.Render("retrying…"))
	}

	// download the utils replacing script

	utilsScriptResp, err := http.Get(web_server_url + "/utils-replace-macos.sh")
	if err != nil {
		fmt.Println(errorStyle.Render("failed to download utils replace script: " + err.Error()))
		return
	}
	defer utilsScriptResp.Body.Close()

	utilsScriptPath := tempDir + "/utils-replace-macos.sh"
	utilsOutFile, err := os.Create(utilsScriptPath)

	if err != nil {
		fmt.Println(errorStyle.Render("failed to create utils replace script file: " + err.Error()))
		return
	}
	defer utilsOutFile.Close()

	if _, err := io.Copy(utilsOutFile, utilsScriptResp.Body); err != nil {
		fmt.Println("failed to save utils replace script: " + err.Error())
		return
	}

	// make the script executable
	err = os.Chmod(utilsScriptPath, 0755)
	if err != nil {
		fmt.Println(errorStyle.Render("failed to make utils replace script executable: " + err.Error()))
		return
	}

	// run the script to replace the hashes
	// cd in the temp dir + pass oldHash + newHash as args
	fmt.Println(textStyle.Render("running utils to replace hashes..."))
	replaceCmd := "cd " + tempDir + " && ./utils-replace-macos.sh " + oldHash + " " + newHash
	fmt.Println(subtitleStyle.Render("running : " + replaceCmd))
	err = exec.Command("bash", "-c", replaceCmd).Run()
	fmt.Println(successStyle.Render("bypassed asar integrity checks!"))

	// replace the bundle id to com.slack.plugin-thingy-uuidhere

	var uuid string
	uuidCmd := exec.Command("uuidgen")
	uuidBytes, err := uuidCmd.Output()
	if err != nil {
		fmt.Println(errorStyle.Render("failed to generate uuid: " + err.Error()))
		return
	}
	uuid = string(uuidBytes)
	uuid = regexp.MustCompile(`\s+`).ReplaceAllString(uuid, "") // trim whitespace

	fmt.Println(textStyle.Render("changing bundle identifier..."))
	infoPlistPath := tempDir + "/Slack.app/Contents/Info.plist"

	// use /usr/libexec/PlistBuddy to change the CFBundleIdentifier
	bundleIdCmd := fmt.Sprintf("/usr/libexec/PlistBuddy -c \"Set :CFBundleIdentifier com.slack.plugin-thingy-%s\" \"%s\"", uuid, infoPlistPath)
	fmt.Println(subtitleStyle.Render("running : " + bundleIdCmd))
	err = exec.Command("bash", "-c", bundleIdCmd).Run()
	if err != nil {
		fmt.Println(errorStyle.Render("failed to change bundle identifier: " + err.Error()))
		return
	}
	fmt.Println(successStyle.Render("bundle identifier changed!"))

	// remove the app in /Applications/Slack.app if it exists

	// first kill any running slack process

	fmt.Println(textStyle.Render("killing any running Slack processes..."))
	killCmd := "pkill -f /Applications/Slack.app/Contents/MacOS/Slack || true"
	fmt.Println(subtitleStyle.Render("running : " + killCmd))
	err = exec.Command("bash", "-c", killCmd).Run()
	if err != nil {
		fmt.Println(errorStyle.Render("failed to kill running Slack processes: " + err.Error()))
		return
	}
	fmt.Println(successStyle.Render("running Slack processes killed!"))

	// now remove the app

	fmt.Println(textStyle.Render("removing existing Slack installation..."))
	removeAppCmd := "rm -rf \"/Applications/Slack.app\""
	fmt.Println(subtitleStyle.Render("running : " + removeAppCmd))
	err = exec.Command("bash", "-c", removeAppCmd).Run()
	if err != nil {
		fmt.Println(errorStyle.Render("failed to remove existing Slack installation: " + err.Error()))
		return
	}
	fmt.Println(successStyle.Render("existing Slack installation removed!"))

	// move the modified app to /Applications/Slack.app

	fmt.Println(textStyle.Render("installing modified Slack app..."))
	installCmd := "mv \"" + tempDir + "/Slack.app\" \"/Applications/Slack.app\""
	fmt.Println(subtitleStyle.Render("running : " + installCmd))
	err = exec.Command("bash", "-c", installCmd).Run()
	if err != nil {
		fmt.Println(errorStyle.Render("failed to install modified Slack app: " + err.Error()))
		return
	}
	fmt.Println(successStyle.Render("modified Slack app installed!"))

	// cleanup temp dir

	fmt.Println(textStyle.Render("cleaning up temporary files..."))
	err = os.RemoveAll(tempDir)
	if err != nil {
		fmt.Println(errorStyle.Render("failed to remove temporary files: " + err.Error()))
		return
	}
	fmt.Println(successStyle.Render("temporary files cleaned up!"))

	// final step :

	// installing the required preload.js and plugin-manager.js and main.js files in ~/.slack-plugin-thingy/
	//
	// create the dir if it doesn't exist

	pluginDir := fmt.Sprintf("%s/.slack-plugin-thingy", os.Getenv("HOME"))
	err = os.MkdirAll(pluginDir, 0755)
	if err != nil {
		fmt.Println(errorStyle.Render("failed to create plugin directory: " + err.Error()))
		return
	}

	// download preload.js

	preloadResp, err := http.Get(web_server_url + "/preload.js")
	if err != nil {
		fmt.Println(errorStyle.Render("failed to download preload.js: " + err.Error()))
		return
	}
	defer preloadResp.Body.Close()

	preloadPath := pluginDir + "/preload.js"
	preloadOutFile, err := os.Create(preloadPath)

	if err != nil {
		fmt.Println(errorStyle.Render("failed to create preload.js file: " + err.Error()))
		return
	}
	defer preloadOutFile.Close()

	if _, err := io.Copy(preloadOutFile, preloadResp.Body); err != nil {
		fmt.Println("failed to save preload.js: " + err.Error())
		return
	}

	// download plugin-manager.js

	managerResp, err := http.Get(web_server_url + "/plugin-manager.js")
	if err != nil {
		fmt.Println(errorStyle.Render("failed to download plugin-manager.js: " + err.Error()))
		return
	}
	defer managerResp.Body.Close()

	managerPath := pluginDir + "/plugin-manager.js"
	managerOutFile, err := os.Create(managerPath)

	if err != nil {
		fmt.Println(errorStyle.Render("failed to create plugin-manager.js file: " + err.Error()))
		return
	}
	defer managerOutFile.Close()

	if _, err := io.Copy(managerOutFile, managerResp.Body); err != nil {
		fmt.Println("failed to save plugin-manager.js: " + err.Error())
		return
	}

	// download plugin-manager.css

	cssResp, err := http.Get(web_server_url + "/plugin-manager.css")
	if err != nil {
		fmt.Println(errorStyle.Render("failed to download plugin-manager.css: " + err.Error()))
		return
	}
	defer cssResp.Body.Close()

	cssPath := pluginDir + "/plugin-manager.css"
	cssOutFile, err := os.Create(cssPath)

	if err != nil {
		fmt.Println(errorStyle.Render("failed to create plugin-manager.css file: " + err.Error()))
		return
	}
	defer cssOutFile.Close()

	if _, err := io.Copy(cssOutFile, cssResp.Body); err != nil {
		fmt.Println("failed to save plugin-manager.css: " + err.Error())
		return
	}

	// download main.js

	mainResp, err := http.Get(web_server_url + "/main.js")
	if err != nil {
		fmt.Println(errorStyle.Render("failed to download main.js: " + err.Error()))
		return
	}
	defer mainResp.Body.Close()

	mainPath := pluginDir + "/main.js"
	mainOutFile, err := os.Create(mainPath)

	if err != nil {
		fmt.Println(errorStyle.Render("failed to create main.js file: " + err.Error()))
		return
	}
	defer mainOutFile.Close()

	if _, err := io.Copy(mainOutFile, mainResp.Body); err != nil {
		fmt.Println("failed to save main.js: " + err.Error())
		return
	}

	fmt.Println(successStyle.Render("preload.js, plugin-manager.js and main.js installed!"))

	// done!

	// run slack once to verify installation

	fmt.Println(textStyle.Render("verifying installation by running Slack..."))
	verifyCmd := exec.Command("open", "/Applications/Slack.app")
	fmt.Println(subtitleStyle.Render("running : open /Applications/Slack.app"))
	err = verifyCmd.Start()
	if err != nil {
		fmt.Println(errorStyle.Render("failed to start Slack for verification: " + err.Error()))
		return
	}
	fmt.Println(successStyle.Render("starting slack..."))
	fmt.Println(successStyle.Render(""))
	fmt.Println(mainTitleStyle.Render("installation complete!"))
}

func update() {
	// just replace the plugin_manager.js, main.js and preload.js files in ~/.slack-plugin-thingy/ and plugin_manager.css

	var pluginDir = fmt.Sprintf("%s/.slack-plugin-thingy", os.Getenv("HOME"))

	downloadFile(web_server_url+"/preload.js", pluginDir+"/preload.js")
	downloadFile(web_server_url+"/plugin-manager.js", pluginDir+"/plugin-manager.js")
	downloadFile(web_server_url+"/main.js", pluginDir+"/main.js")
	downloadFile(web_server_url+"/plugin-manager.css", pluginDir+"/plugin-manager.css")

	fmt.Println(successStyle.Render("preload.js, plugin-manager.js, main.js and plugin-manager.css updated!"))
}

func downloadFile(url string, dest string) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return err
	}

	return nil
}

func execCommand(command string) error {
	fmt.Println(subtitleStyle.Render("running : " + command))
	cmd := exec.Command("bash", "-c", command)
	return cmd.Run()
}
