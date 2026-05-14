import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onChildAdded, remove, set, onDisconnect } from 'firebase/database';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private app: FirebaseApp | undefined;

  constructor(private toastr: ToastrService) {}

  init(config: any) {
    // Validate that Firebase config has required keys
    if (!config?.projectId || !config?.databaseURL) {
      console.warn('FirebaseService: Firebase config is incomplete. Skipping initialization.', {
        hasProjectId: !!config?.projectId,
        hasDatabaseURL: !!config?.databaseURL,
      });
      return;
    }

    if (!this.app) {
      try {
        this.app = initializeApp({
          apiKey: config['apiKey'],
          authDomain: config['authDomain'],
          projectId: config['projectId'],
          databaseURL: config['databaseURL'],
        });
        console.log('FirebaseService initialized successfully');
      } catch (error) {
        console.error('FirebaseService initialization failed:', error);
      }
    }
  }

  listen(userId: string) {
    if (!this.app) {
      console.warn('FirebaseService: Firebase is not initialized. Realtime notifications disabled.');
      return;
    }

    const db = getDatabase(this.app);

    const activeRef = ref(db, 'activeUsers/' + userId);
    set(activeRef, true);
    onDisconnect(activeRef).set(false);

    const userRef = ref(db, 'notifications/' + userId);

    onChildAdded(userRef, (snapshot) => {
      const data = snapshot.val();

      this.toastr.info(data?.text || 'New notification', '');

      remove(snapshot.ref);
    });
  }
}
