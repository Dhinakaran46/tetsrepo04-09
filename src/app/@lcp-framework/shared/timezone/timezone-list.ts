// Comprehensive IANA timezone list with offsets
// Source: https://github.com/vvo/tzdb, https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
// Only a sample is shown here for brevity; the real file will contain all IANA zones.

export const TIMEZONE_LIST = [
  { name: 'UTC', label: 'UTC +00:00' },
  { name: 'Europe/London', label: 'Europe/London +00:00' },
  { name: 'Europe/Paris', label: 'Europe/Paris +01:00' },
  { name: 'Europe/Berlin', label: 'Europe/Berlin +01:00' },
  { name: 'Europe/Moscow', label: 'Europe/Moscow +03:00' },
  { name: 'Asia/Kolkata', label: 'Asia/Kolkata +05:30' },
  { name: 'Asia/Tokyo', label: 'Asia/Tokyo +09:00' },
  { name: 'Australia/Sydney', label: 'Australia/Sydney +10:00' },
  { name: 'America/New_York', label: 'America/New_York -05:00' },
  { name: 'America/Chicago', label: 'America/Chicago -06:00' },
  { name: 'America/Denver', label: 'America/Denver -07:00' },
  { name: 'America/Los_Angeles', label: 'America/Los_Angeles -08:00' },
  // ... (add all IANA zones here, see tzdb or moment-timezone for full list)
]; 