#!/bin/bash

# Script to delete all Firebase projects
# WARNING: This is destructive and cannot be undone!

set -e

echo "=========================================="
echo "  Firebase Project Deletion Script"
echo "=========================================="
echo ""
echo "WARNING: This will permanently delete ALL your Firebase projects!"
echo "This action CANNOT be undone."
echo ""

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Error: Firebase CLI is not installed."
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if logged in
if ! firebase projects:list &> /dev/null; then
    echo "Error: Not logged in to Firebase."
    echo "Run: firebase login"
    exit 1
fi

# Get list of projects
echo "Fetching your Firebase projects..."
echo ""

projects=$(firebase projects:list --json 2>/dev/null | jq -r '.result[].projectId' 2>/dev/null)

if [ -z "$projects" ]; then
    echo "No Firebase projects found."
    exit 0
fi

echo "The following projects will be PERMANENTLY DELETED:"
echo ""
echo "$projects" | while read -r project; do
    echo "  - $project"
done
echo ""

read -p "Are you absolutely sure you want to delete ALL these projects? (type 'DELETE ALL' to confirm): " confirmation

if [ "$confirmation" != "DELETE ALL" ]; then
    echo "Aborted. No projects were deleted."
    exit 0
fi

echo ""
echo "Deleting projects..."
echo ""

echo "$projects" | while read -r project; do
    if [ -n "$project" ]; then
        echo "Deleting: $project"
        firebase projects:delete "$project" --force || echo "  Failed to delete $project (may require manual deletion in console)"
    fi
done

echo ""
echo "Done. All projects have been processed."
echo "Note: Some projects may require manual deletion at https://console.firebase.google.com"
