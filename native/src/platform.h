#pragma once
#include <string>

namespace context_bridge {

// Returns selected text via OS accessibility API, or empty string if unavailable.
std::string getSelectedTextViaAccessibility();

// Simulates Cmd+C (macOS) or Ctrl+C (Windows) in the frontmost app.
void simulateCopy();

// Returns true if the process has accessibility permission (always true on Windows).
bool isAccessibilityGranted();

} // namespace context_bridge
