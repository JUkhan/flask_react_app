
import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

interface IWindow extends Window {
  webkitSpeechRecognition: any;
}

@Injectable({
  providedIn: 'root'
})
export class SpeechRecognitionService {
  private speechRecognition: any;
  public isListening = false;
  public transcript$ = new Subject<string>();
  public error$ = new Subject<string>();

  constructor(private ngZone: NgZone) {
    const { webkitSpeechRecognition }: IWindow = (window as unknown) as IWindow;
    if (webkitSpeechRecognition) {
      this.speechRecognition = new webkitSpeechRecognition();
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.lang = 'en-US';

      this.speechRecognition.onresult = (event: any) => {
        this.ngZone.run(() => {
          let final_transcript = '';
          let interim_transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final_transcript += event.results[i][0].transcript;
            } else {
              interim_transcript += event.results[i][0].transcript;
            }
          }
          this.transcript$.next(final_transcript + interim_transcript);
        });
      };

      this.speechRecognition.onerror = (event: any) => {
        this.ngZone.run(() => {
          this.error$.next(event.error);
        });
      };

      this.speechRecognition.onend = () => {
        this.ngZone.run(() => {
          this.isListening = false;
        });
      };
    } else {
      this.error$.next('Speech recognition not supported in this browser.');
    }
  }

  start() {
    if (this.speechRecognition && !this.isListening) {
      this.isListening = true;
      this.speechRecognition.start();
    }
  }

  stop() {
    if (this.speechRecognition && this.isListening) {
      this.speechRecognition.stop();
      this.isListening = false;
    }
  }
}

