#include <napi.h>
#include "platform.h"

Napi::Value GetFrontmostAppPid(const Napi::CallbackInfo& info) {
  return Napi::Number::New(info.Env(), context_bridge::getFrontmostAppPid());
}

Napi::Value GetSelectedTextViaAccessibility(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  int pid = 0;
  if (info.Length() > 0 && info[0].IsNumber()) {
    pid = info[0].As<Napi::Number>().Int32Value();
  }
  std::string text = context_bridge::getSelectedTextViaAccessibility(pid);
  if (text.empty()) {
    return env.Null();
  }
  return Napi::String::New(env, text);
}

Napi::Value SimulateCopy(const Napi::CallbackInfo& info) {
  context_bridge::simulateCopy();
  return info.Env().Undefined();
}

Napi::Value IsAccessibilityGranted(const Napi::CallbackInfo& info) {
  bool prompt = false;
  if (info.Length() > 0 && info[0].IsBoolean()) {
    prompt = info[0].As<Napi::Boolean>().Value();
  }
  return Napi::Boolean::New(info.Env(), context_bridge::isAccessibilityGranted(prompt));
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("getFrontmostAppPid",
              Napi::Function::New(env, GetFrontmostAppPid));
  exports.Set("getSelectedTextViaAccessibility",
              Napi::Function::New(env, GetSelectedTextViaAccessibility));
  exports.Set("simulateCopy",
              Napi::Function::New(env, SimulateCopy));
  exports.Set("isAccessibilityGranted",
              Napi::Function::New(env, IsAccessibilityGranted));
  return exports;
}

NODE_API_MODULE(context_bridge, Init)
