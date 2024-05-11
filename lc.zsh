#!/bin/zsh

# Navigating to the project root directory (if necessary)
#cd /path/to/your/project

# Command to find and count lines in client3 and server folders, excluding node_modules
find client3 server \( -name '*.js' -o -name '*.html' -o -name '*.css' -o -name '*.go' \) -print | grep -v 'node_modules/' | xargs wc -l
