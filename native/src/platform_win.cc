#include "platform.h"

#ifdef _WIN32

// TODO: Real implementation with UI Automation + SendInput (issues #6, #7)
// Requires: <windows.h>, <UIAutomation.h>
// Build and test on a Windows device.

namespace context_bridge {

int getFrontmostAppPid() {
  return 0;
}

std::string getSelectedTextViaAccessibility(int) {
  return "";
}

void simulateCopy() {
}

bool isAccessibilityGranted(bool) {
  return true;
}

} // namespace context_bridge

#endif
