#pragma once
#include <string>

namespace context_bridge {

// Returns selected text via OS accessibility API, or empty string if unavailable.
std::string getSelectedTextViaAccessibility();

// Simulates Cmd+C (macOS) or Ctrl+C (Windows) in the frontmost app.
void simulateCopy();

// Checks accessibility permission. If prompt is true, shows the macOS system dialog.
bool isAccessibilityGranted(bool prompt = false);

} // namespace context_bridge
