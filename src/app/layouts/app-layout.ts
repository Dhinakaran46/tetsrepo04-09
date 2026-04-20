import { Component, OnDestroy, Renderer2 } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppService } from '../@lcp-framework/service/common/app.service';
import { Router, NavigationEnd } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './sidebar';
import { ThemeCustomizerComponent } from './theme-customizer';
import { HeaderComponent } from './header';
import { CommonSharedModule } from '../@lcp-framework/shared/common/common.module';
import { FormsModule } from '@angular/forms';
import { initialState } from '../store/index.reducer';
import { environment } from '../../environments/environment';
import { LocalStorageService } from '../@lcp-framework/service/common/local-storage.service';
import { OpenaiService } from '../@lcp-framework/service/common/openai.service';
import { LayoutReadyService } from '../@lcp-framework/service/common/layout-ready.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app-layout.html',
  standalone: true,
  imports: [CommonSharedModule, RouterModule, SidebarComponent, ThemeCustomizerComponent, HeaderComponent, TranslateModule, FormsModule],
})
export class AppLayout implements OnDestroy {
  store: any = initialState;
  isLoading = true;
  showTopButton = false;
  apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  enableVoiceSearch = false;
  private menuReadySub?: Subscription;

  constructor(
    private renderer: Renderer2,
    public translate: TranslateService,
    public storeData: Store<any>,
    private service: AppService,
    private router: Router,
    private localstore: LocalStorageService,
    private openaiService: OpenaiService,
    private layoutReadyService: LayoutReadyService
  ) {
    // Reset ready state so loader shows on each fresh navigation to app layout
    this.layoutReadyService.reset();
  }
  headerClass = '';

  mediaRecorder: any;
  audioChunks: any[] = [];
  audioBlob: Blob | null = null;
  isRecording = false;
  transcribedText: string = '';
  isTranscribing = false;
  transcribingText: string = 'Transcribing';
  displayedText: string = '';
  fullTranscribedText: string = '';
  hasTranscriptionData: boolean = false;
  micHoverText: string = 'Tap to hold & record';
  showTooltip: boolean = false;
  isPreviewOpen: boolean = false;
  isHolding: boolean = false;
  holdTimer: any;

  private isConfigFlagEnabled(value: unknown): boolean {
    return value === true || value === 'true';
  }

  ngOnInit() {
    this.initStore();
    const apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
    const configRaw = this.localstore.getData('config');
    if (configRaw) {
      try {
        const config = JSON.parse(configRaw);
        this.enableVoiceSearch = this.isConfigFlagEnabled(config?.enable_voice_search);
        if (config?.favicon) {
          this.changeFavicon(apiUrl + '/' + config.favicon);
        }
      } catch (error) {
        this.enableVoiceSearch = false;
      }
    }

    // Wait for sidebar menu to finish loading before hiding the loader
    this.menuReadySub = this.layoutReadyService.menuReady.subscribe((ready) => {
      if (ready) {
        this.isLoading = false;
        this.storeData.dispatch({ type: 'toggleMainLoader', payload: false });
      }
    });

    this.initAnimation();
    this.startTypingAnimation();
    window.addEventListener('scroll', () => {
      if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
        this.showTopButton = true;
      } else {
        this.showTopButton = false;
      }
    });
  }

  ngOnDestroy() {
    this.menuReadySub?.unsubscribe();
    window.removeEventListener('scroll', () => {});
  }

  initAnimation() {
    this.service.changeAnimation();
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.service.changeAnimation();
      }
    });

    const ele: HTMLElement | null = document.querySelector('.animation');
    ele?.addEventListener('animationend', () => {
      this.service.changeAnimation('remove');
    });
  }

  changeFavicon(url: any): void {    const favicon = this.renderer.selectRootElement('#common-favicon', true);
    this.renderer.setAttribute(favicon, 'href', url);
  }

  initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  goToTop() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }

  startTypingAnimation() {
    let dots = 0;
    setInterval(() => {
      if (this.isTranscribing) {
        dots = (dots + 1) % 4;
        this.transcribingText = 'Transcribing' + '.'.repeat(dots);
      }
    }, 2000);
  }

  typeWordByWord(text: string) {
    this.fullTranscribedText = text;
    this.displayedText = '';
    const words = text.split(' ');
    let currentWordIndex = 0;

    const typeNextWord = () => {
      if (currentWordIndex < words.length) {
        if (currentWordIndex > 0) {
          this.displayedText += ' ';
        }
        this.displayedText += words[currentWordIndex];
        currentWordIndex++;
        setTimeout(typeNextWord, 1100); // Adjust speed as needed
      }
    };

    typeNextWord();
  }

  stopRecordingAndSend() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.onstop = () => {
        this.audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.isRecording = false;
        // Automatically send the audio when recording stops
        this.sendAudio();
      };
      this.mediaRecorder.stop();
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
  }

  togglePreview() {
    this.isPreviewOpen = !this.isPreviewOpen;
    if (!this.isPreviewOpen) {
      this.closeTranscriptionPreview();
    }
  }

  startHold() {
    this.isHolding = true;
    this.holdTimer = setTimeout(() => {
      if (this.isHolding) {
        this.startRecording();
        this.micHoverText = 'Release to translate';
      }
    }, 300); // Increased delay to better distinguish click from hold
  }

  endHold() {
    if (this.isHolding && !this.isRecording) {
      // this is the click, not a hold
      setTimeout(() => {
        if (!this.isRecording) {
          this.togglePreview();
        }
      }, 50);
    } else if (this.isRecording) {
      this.stopRecordingAndSend();
    }
    this.isHolding = false;
    clearTimeout(this.holdTimer);
  }

  handleMicClick(event: MouseEvent) {
    // Prevent default to avoid interference with mouse events
    event.preventDefault();
  }

  async startVoiceSearch() {
    if (!this.isRecording) {
      this.startRecording();
    } else {
      this.stopRecording();
    }
  }

  async startRecording() {
    if (this.isRecording) return;
    this.isRecording = true;
    this.audioChunks = []; // Reset chunks for new recording
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    this.mediaRecorder = new MediaRecorder(stream);

    this.mediaRecorder.ondataavailable = (event: any) => {
      this.audioChunks.push(event.data);
    };

    this.mediaRecorder.onstop = () => {
      this.audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
      this.isRecording = false;
    };

    this.mediaRecorder.start();
  }

  playAudio() {
    if (this.audioBlob) {
      const audioUrl = URL.createObjectURL(this.audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    }
  }

  closeTranscriptionPreview() {
    this.displayedText = '';
    this.transcribedText = '';
    this.fullTranscribedText = '';
    this.isTranscribing = false;
    this.hasTranscriptionData = false;
    this.isPreviewOpen = false;
  }

  sendTranscribedText() {
    if (this.displayedText && this.displayedText.trim()) {
      this.openaiService.searchMenuTargetEmbeddings({ query: this.displayedText.trim() }).subscribe(
        (res) => {
          // Check if response is successful and has results
          if (res.code === 200 && res.status === true && res.data?.results?.length > 0) {
            const firstResult = res.data.results[0];
            const targetRoute = firstResult.target;

            // Navigate to the target route
            this.router.navigate([targetRoute]);

            // Close the transcription preview after navigation
            this.closeTranscriptionPreview();
          } else {
            console.warn('No results found or API error');
          }
        },
        (error) => {
          console.error('Search API error:', error);
        }
      );
    }
  }

  handleEnterKey(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendTranscribedText();
    }
  }

  sendAudio() {
    if (this.audioBlob) {
      this.isTranscribing = true;
      this.displayedText = ''; // Clear previous text
      this.fullTranscribedText = ''; // Clear previous text
      const formData = new FormData();
      formData.append('audio', this.audioBlob, 'recording.wav');

      this.openaiService.transcribeAudio(formData).subscribe(
        (res) => {
          // Store the transcribed text and start word-by-word animation
          const transcribedResult = res.data?.transcription?.processedText || res.data?.transcription?.originalText || 'Transcription not available';
          this.transcribedText = transcribedResult;
          this.isTranscribing = false;
          this.hasTranscriptionData = true; // Set flag to keep preview open
          this.typeWordByWord(transcribedResult);
        },
        (error) => {
          console.error('Transcription error:', error);
          this.transcribedText = 'Transcription failed';
          this.displayedText = 'Transcription failed';
          this.isTranscribing = false;
        }
      );
    }
  }
}
