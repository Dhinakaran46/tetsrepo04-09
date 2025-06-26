# Datetime Formatting System

This system provides universal datetime formatting across the application based on the configured timezone and datetime format from the login configuration.

## Configuration

The system uses the following configuration from the login response:
- `enc_config.display_timezone` - The timezone to display dates in
- `enc_config.display_datetime_format` - The format to display datetime values

## Usage

### In Templates

Use the datetime pipes in your templates:

```html
<!-- For datetime values (uses configured format) -->
<span>{{ item.created_at | datetime }}</span>

<!-- For date-only values -->
<span>{{ item.birth_date | date }}</span>

<!-- With custom format -->
<span>{{ item.created_at | datetime:'yyyy-MM-dd HH:mm:ss' }}</span>
```

### In Components

Inject the TimezoneService in your component:

```typescript
import { TimezoneService } from '../../service/common/timezone.service';

constructor(private timezoneService: TimezoneService) {}

// Format datetime using configured format
const formattedDateTime = this.timezoneService.transformDateTime(dateValue);

// Format date only
const formattedDate = this.timezoneService.transformDateOnly(dateValue);

// Format with custom format
const customFormatted = this.timezoneService.transformDate(dateValue, 'yyyy-MM-dd HH:mm:ss');
```

## Available Methods

### TimezoneService Methods

- `transformDateTime(date)` - Format datetime using configured format
- `transformDateOnly(date)` - Format date only (yyyy-MM-dd)
- `transformDate(date, format?)` - Format with custom format
- `transformTimeOnly(date)` - Format time only (HH:mm:ss)
- `isDate(value)` - Check if value is a valid date
- `getDisplayTimezone()` - Get configured timezone
- `getDisplayDateTimeFormat()` - Get configured datetime format
- `reloadConfig()` - Reload configuration (call after login)

### Pipes

- `datetime` - Format datetime using configured format
- `date` - Format date only

## Automatic Updates

The system automatically reloads configuration after login, so all datetime formatting will use the new timezone and format settings.

## Examples

### Before (using DatePipe)
```typescript
// Old way - hardcoded format
const formatted = this.datePipe.transform(date, 'yyyy-MM-dd HH:mm:ss');
```

### After (using TimezoneService)
```typescript
// New way - uses configured format and timezone
const formatted = this.timezoneService.transformDateTime(date);
```

### In Templates
```html
<!-- Before -->
<span>{{ item.created_at | date:'yyyy-MM-dd HH:mm:ss' }}</span>

<!-- After -->
<span>{{ item.created_at | datetime }}</span>
``` 