#include "platform.h"

#ifdef _WIN32

// TODO: Real implementation with UI Automation + SendInput (issues #6, #7)
// Requires: <windows.h>, <UIAutomation.h>
// Build and test on a Windows device.

namespace context_bridge {

std::string getSelectedTextViaAccessibility() {
  return "";
}

void simulateCopy() {
}

bool isAccessibilityGranted() {
  return true;
}

} // namespace context_bridge

#endif
