import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CountryTimezoneService {
  private countryTimezones: { [countryCode: string]: string } = {
    US: '+05:30', // Replace with actual data
    CA: '+06:00',
    // Add more country codes and their corresponding timezones
  };

  getCountryTimezones(): { [countryCode: string]: string } {
    return this.countryTimezones;
  }

  getTimezoneByCountryCode(countryCode: string): string {
    return this.countryTimezones[countryCode] || '';
  }
}
