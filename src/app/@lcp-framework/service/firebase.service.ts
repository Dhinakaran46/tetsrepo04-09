import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onChildAdded, remove, set, onDisconnect } from 'firebase/database';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private app!: FirebaseApp;

  constructor(private toastr: ToastrService) {}

  init(config: any) {
    if (!this.app) {
      this.app = initializeApp({
        apiKey: config['apiKey'],
        authDomain: config['authDomain'],
        projectId: config['projectId'],
        databaseURL: config['databaseURL'],
      });
    }
  }

  listen(userId: string) {
    if (!this.app) {
      throw new Error('Firebase not initialized. Call init() first.');
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
