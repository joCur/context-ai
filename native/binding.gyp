{
  "targets": [
    {
      "target_name": "context_bridge",
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "sources": ["src/addon.cc"],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": ["NAPI_VERSION=8", "NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        ["OS=='mac'", {
          "sources": ["src/platform_mac.mm"],
          "xcode_settings": {
            "OTHER_CPLUSPLUSFLAGS": ["-ObjC++", "-std=c++17"],
            "OTHER_LDFLAGS": [
              "-framework AppKit",
              "-framework ApplicationServices",
              "-framework CoreFoundation"
            ]
          }
        }],
        ["OS=='win'", {
          "sources": ["src/platform_win.cc"],
          "libraries": ["-lUIAutomationCore", "-lOle32"]
        }]
      ]
    }
  ]
}
