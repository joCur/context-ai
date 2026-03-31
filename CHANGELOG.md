# Changelog

## [1.0.2](https://github.com/joCur/context-ai/compare/v1.0.1...v1.0.2) (2026-03-31)


### Bug Fixes

* release build for native addon packaging ([#53](https://github.com/joCur/context-ai/issues/53)) ([a0b0c48](https://github.com/joCur/context-ai/commit/a0b0c48481b967117d1155e87a6b69d4bb0d5574))
* run CI on release-please branches ([#55](https://github.com/joCur/context-ai/issues/55)) ([b62fcbb](https://github.com/joCur/context-ai/commit/b62fcbb44dede47b8f27bb764444588d8c0cba9e))

## [1.0.1](https://github.com/joCur/context-ai/compare/v1.0.0...v1.0.1) (2026-03-31)


### Bug Fixes

* skip code signing when no certificate configured ([#50](https://github.com/joCur/context-ai/issues/50)) ([15b1d14](https://github.com/joCur/context-ai/commit/15b1d14162090d0fd9ae10622ed68945cf4d3698))

## 1.0.0 (2026-03-31)


### Features

* accessibility permission detection with onboarding banner ([6b9d9d0](https://github.com/joCur/context-ai/commit/6b9d9d0860d9e0b5b1444e06aa7dc7b535d2d0e2))
* add app icon resources with tray template for macOS ([684fab2](https://github.com/joCur/context-ai/commit/684fab26d23028a92da9ba4ac7784ff758a34f29))
* add dependencies and IPC for prompt window dismiss + output actions ([47c31b5](https://github.com/joCur/context-ai/commit/47c31b59cbe3e8b54f4d0f471de75fc0721df74e))
* add electron-store settings with encrypted API key storage and shared types ([82b96fd](https://github.com/joCur/context-ai/commit/82b96fd49afe47af14af6cf585d46c4e6c526c1f))
* auto-update via electron-updater with tray notifications ([26cc1b3](https://github.com/joCur/context-ai/commit/26cc1b336aea3a2af92bd92b7f7d2241d62a1f94))
* create Electron shell with React, Tailwind v4, and shadcn/ui ([1033eb1](https://github.com/joCur/context-ai/commit/1033eb1bde4116a135020b5939af2ab9f9e91271))
* define shared IPC channel names and types ([5fd8aca](https://github.com/joCur/context-ai/commit/5fd8acaf9aba3a039823c677dd3b00deaa68bdfe))
* first-run welcome screen when no API key configured ([60dafbc](https://github.com/joCur/context-ai/commit/60dafbc643ae8a222529c9365f764157cd5fd9c0))
* handle config errors (no API key/model) in prompt window ([09403e1](https://github.com/joCur/context-ai/commit/09403e113831a6c95d134e1751a629f0e1842713))
* implement global hotkey registration with re-bind support ([a8a732c](https://github.com/joCur/context-ai/commit/a8a732cae108e85c03b76fe4c8597a9c4a54fd4c))
* implement type-safe IPC layer with preload bridge ([b5666e7](https://github.com/joCur/context-ai/commit/b5666e749fdb80775c76893597f20127611da123))
* integrate PromptWindow into App with transparent background ([d7459e8](https://github.com/joCur/context-ai/commit/d7459e8c4434b283a3a2c6cf1ad57f9b8a86a18f))
* JS orchestration for text capture with accessibility + clipboard fallback ([f1347e5](https://github.com/joCur/context-ai/commit/f1347e51d84534f7042dd290cd441a253bf292d5))
* M7 packaging and CI/CD pipeline ([dae9229](https://github.com/joCur/context-ai/commit/dae9229c1326e6063b5e64836c8c35e6fb08cd84))
* macOS text capture via accessibility API + clipboard fallback ([f4446ea](https://github.com/joCur/context-ai/commit/f4446ea93a62d26e6f3bb3a53fa0baad45c5de6a))
* native addon build infrastructure with node-gyp ([2affe50](https://github.com/joCur/context-ai/commit/2affe503ab7d23380277aea7693cf6adbaee3007))
* OpenRouter streaming integration with error handling ([4049457](https://github.com/joCur/context-ai/commit/4049457749998727bc6996d83214616f8821ae90))
* prompt state reducer and hook with IPC wiring ([aae4ada](https://github.com/joCur/context-ai/commit/aae4ada4149e82e099070337203de00d5e117d7d))
* PromptInput, ContextBar, QuickActions, SubmittedPrompt components ([c011982](https://github.com/joCur/context-ai/commit/c011982cb12549e94e842cf2aceaa841d742744d))
* PromptWindow shell orchestrating all child components ([c7339b0](https://github.com/joCur/context-ai/commit/c7339b0928b561e84faad29313db26ff01c0c22b))
* replace mock streaming with real OpenRouter API calls ([1c58229](https://github.com/joCur/context-ai/commit/1c58229e57092173c3c06f6c146486f87787ebd7))
* ResponseArea with markdown rendering and ActionBar ([e014e96](https://github.com/joCur/context-ai/commit/e014e96ab0f4d4e36a0da0fca9e1b2eab3743538))
* settings window with 4 tabs, storage, and prompt integration ([430329c](https://github.com/joCur/context-ai/commit/430329c986f160bdf81e9f7fc619729013189801))
* Windows text capture stub (real implementation pending Windows device) ([526a0a1](https://github.com/joCur/context-ai/commit/526a0a19c954e1fc0a12292e080e4460d65b49d5))
* wire global hotkey to toggle prompt window ([e1e0f3f](https://github.com/joCur/context-ai/commit/e1e0f3f52b0c5c3114932ab9cc3b38fe0ee52657))
* wire text capture into hotkey flow ([ee2239a](https://github.com/joCur/context-ai/commit/ee2239ac96ec3387f4388f78c39a21bcb3f56cbd))


### Bug Fixes

* dynamic window sizing instead of transparent background ([29d4bb0](https://github.com/joCur/context-ai/commit/29d4bb0f74ae5f7ed1986c172884b3655c8d0bfd))
* improve accessibility permission flow ([783a3e6](https://github.com/joCur/context-ai/commit/783a3e624a1762ed71cca189c82d5c4c7fce03f0))
* instant window open with async text capture ([922fb90](https://github.com/joCur/context-ai/commit/922fb902cc1a286f2e08e2ddf3837c03277c8e9b))
* pin vite@7, plugin-react@5 for electron-vite compat, gitignore .claude/ ([208bb2c](https://github.com/joCur/context-ai/commit/208bb2cc7db3ea159848236d6f66ad0fec2935f9))
* prompt window appears on current macOS Space only ([af6a9ac](https://github.com/joCur/context-ai/commit/af6a9ac557df638f6949574778fea903fc4d2ca1))
* text capture from Chrome + clean response system prompt ([04a9858](https://github.com/joCur/context-ai/commit/04a985816a5f8b4293d67eb73244f30dfba47eca))
* UX improvements for settings window ([ab67d94](https://github.com/joCur/context-ai/commit/ab67d94b12182e7614f1d0d8457c4c0a1b4feff1))
* welcome screen heading color, settings opens to correct tab ([75e1c62](https://github.com/joCur/context-ai/commit/75e1c62b14eed348c3cba1e5e1560770fc63b622))
