#include "platform.h"
#import <AppKit/AppKit.h>
#import <ApplicationServices/ApplicationServices.h>

namespace context_bridge {

std::string getSelectedTextViaAccessibility() {
  @try {
    NSRunningApplication* frontApp = [[NSWorkspace sharedWorkspace] frontmostApplication];
    if (!frontApp) return "";

    pid_t pid = [frontApp processIdentifier];
    AXUIElementRef appElement = AXUIElementCreateApplication(pid);
    if (!appElement) return "";

    AXUIElementRef focusedElement = nullptr;
    AXError error = AXUIElementCopyAttributeValue(
      appElement, kAXFocusedUIElementAttribute, (CFTypeRef*)&focusedElement);
    CFRelease(appElement);

    if (error != kAXErrorSuccess || !focusedElement) return "";

    CFTypeRef selectedText = nullptr;
    error = AXUIElementCopyAttributeValue(
      focusedElement, kAXSelectedTextAttribute, &selectedText);
    CFRelease(focusedElement);

    if (error != kAXErrorSuccess || !selectedText) return "";

    if (CFGetTypeID(selectedText) != CFStringGetTypeID()) {
      CFRelease(selectedText);
      return "";
    }

    NSString* nsText = (__bridge NSString*)selectedText;
    std::string result = [nsText UTF8String] ?: "";
    CFRelease(selectedText);

    return result;
  } @catch (NSException*) {
    return "";
  }
}

void simulateCopy() {
  CGEventSourceRef source = CGEventSourceCreate(kCGEventSourceStateHIDSystemState);
  if (!source) return;

  // Key code 8 = 'c'
  CGEventRef keyDown = CGEventCreateKeyboardEvent(source, (CGKeyCode)8, true);
  CGEventSetFlags(keyDown, kCGEventFlagMaskCommand);

  CGEventRef keyUp = CGEventCreateKeyboardEvent(source, (CGKeyCode)8, false);
  CGEventSetFlags(keyUp, kCGEventFlagMaskCommand);

  CGEventPost(kCGHIDEventTap, keyDown);
  CGEventPost(kCGHIDEventTap, keyUp);

  CFRelease(keyDown);
  CFRelease(keyUp);
  CFRelease(source);
}

bool isAccessibilityGranted() {
  return AXIsProcessTrusted();
}

} // namespace context_bridge
