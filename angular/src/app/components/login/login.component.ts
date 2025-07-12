import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';

  constructor(private http: HttpClient, private router: Router) { }

  onSubmit(): void {
    console.log('Login attempted with:', this.username, this.password);
    this.http.post('/api/login', { username: this.username, email: this.password })
      .subscribe({
        next: (response: any) => {
          console.log('Login successful:', response);
          sessionStorage.setItem('userId', response.id); // Assuming the response contains a userId
          this.router.navigate(['/dashboard']);
          // Handle successful login, e.g., redirect to dashboard
        },
        error: (error) => {
          console.error('Login failed:', error);

        }
      });
  }
}
