import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  isDevMode,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideServiceWorker } from '@angular/service-worker';

// Firebase imports
import { provideFirebaseApp, initializeApp, getApp } from '@angular/fire/app';
import {
  provideFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from '@angular/fire/firestore';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAnimationsAsync(),
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),

    // Firebase providers
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => {
      const firestore = initializeFirestore(getApp(), {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });

      // Connect to emulator in development
      if (environment.useEmulators) {
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      }

      return firestore;
    }),
    provideAuth(() => {
      const auth = getAuth();

      // Connect to emulator in development
      if (environment.useEmulators) {
        connectAuthEmulator(auth, 'http://localhost:9099', {
          disableWarnings: true,
        });
      }

      return auth;
    }),
  ],
};
