#pragma once
#include <string>

namespace context_bridge {

// Returns selected text via OS accessibility API, or empty string if unavailable.
// If pid is provided, queries that specific app instead of the system-wide focused element.
std::string getSelectedTextViaAccessibility(int pid = 0);

// Returns the PID of the frontmost application.
int getFrontmostAppPid();

// Simulates Cmd+C (macOS) or Ctrl+C (Windows) in the frontmost app.
void simulateCopy();

// Checks accessibility permission. If prompt is true, shows the macOS system dialog.
bool isAccessibilityGranted(bool prompt = false);

} // namespace context_bridge
