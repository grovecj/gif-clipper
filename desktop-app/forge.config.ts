import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
// import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import ffmpegPath from 'ffmpeg-static';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'Gif Clipper',
    executableName: 'gif-clipper',
    appBundleId: 'me.cartergrove.gifclipper',
    // icon: './assets/icon', // Will add icon later
    extraResource: [ffmpegPath],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'gif-clipper',
      // iconUrl: 'https://...',
      // setupIcon: './assets/icon.ico',
    }),
    new MakerZIP({}, ['darwin']),
    new MakerDeb({
      options: {
        maintainer: 'Carter Grove',
        homepage: 'https://github.com/grovecj/gif-clipper',
      },
    }),
    // MakerRpm disabled - requires rpmbuild
    // new MakerRpm({
    //   options: {
    //     homepage: 'https://github.com/grovecj/gif-clipper',
    //   },
    // }),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/preload/index.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
