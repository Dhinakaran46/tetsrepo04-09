# Mobile View Configuration Guide

## Overview

The mobile view configuration system allows grid_builder_module entities to define custom card layouts that render dynamically on mobile devices (iOS and Android via Capacitor). The configuration is stored in `entity_configurations.mobile_view` and is automatically used by the mobile-list component.

## Configuration Structure

```json
{
  "mobile_view_type": "card",
  "mobile_view": {
    "view_type": "card",
    "card": {
      "style": "elevated",
      "shape": "rounded",
      "grid_columns": 4,
      "grid_rows": 4,
      "row": {
        "row_no": 1,
        "divider_after": true,
        "columns": [
          {
            "field_name": "user_information.code",
            "label": "code",
            "type": "text",
            "col_span": 1,
            "row_span": 1,
            "align": "left"
          }
        ]
      }
    }
  }
}
```

## Configuration Properties

### Top Level

| Property | Type | Values | Description |
|----------|------|--------|-------------|
| `mobile_view_type` | string | `"card"` \| `"list"` | Determines which mobile renderer to use |
| `mobile_view` | object | - | Container for mobile view configuration |

### Card Configuration

| Property | Type | Values | Description |
|----------|------|--------|-------------|
| `view_type` | string | `"card"` | Must be "card" for card-based layouts |
| `card.style` | string | `"elevated"` \| `"flat"` \| `"outlined"` | Visual style of the card |
| `card.shape` | string | `"rounded"` \| `"square"` | Card border radius |
| `card.grid_columns` | number | 1-12 | Number of grid columns (default: 4) |
| `card.grid_rows` | number | 1-20 | Number of grid rows (default: 4) |

### Row Configuration

| Property | Type | Description |
|----------|------|-------------|
| `row.row_no` | number | Row number (always 1 for single-row config) |
| `row.divider_after` | boolean | Show divider after this row |
| `row.columns` | array | Array of column configurations |

### Column Configuration

| Property | Type | Values | Description |
|----------|------|--------|-------------|
| `field_name` | string | - | Field path (e.g., "user.name" or "STRING_AGG(roles.name, ', ')") |
| `label` | string | - | Display label for the field |
| `type` | string | `"text"` \| `"badge"` \| `"icon_text"` \| `"media"` | Column type |
| `col_span` | number | 1-grid_columns | How many columns this field spans |
| `row_span` | number | 1-grid_rows | How many rows this field spans |
| `align` | string | `"left"` \| `"center"` \| `"right"` | Text alignment |
| `show_label` | boolean | true \| false | Whether to show the label |

## Column Types

### text
Basic text display. Default type for most fields.

```json
{
  "field_name": "user.name",
  "label": "Name",
  "type": "text",
  "col_span": 2,
  "row_span": 1,
  "align": "left"
}
```

### badge
Displays value in a colored badge (useful for status fields).

```json
{
  "field_name": "status",
  "label": "Status",
  "type": "badge",
  "col_span": 1,
  "row_span": 1,
  "align": "center"
}
```

### icon_text
Shows an icon alongside text.

```json
{
  "field_name": "email",
  "label": "Email",
  "type": "icon_text",
  "col_span": 2,
  "row_span": 1,
  "align": "left"
}
```

### media
For images or media content (future enhancement).

```json
{
  "field_name": "avatar_url",
  "label": "",
  "type": "media",
  "col_span": 1,
  "row_span": 2,
  "align": "center"
}
```

## Card Styles

### elevated
Card with shadow and border (default).

```css
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
border: 1px solid #e0e6ed;
```

### flat
Card with flat background, no shadow.

```css
background: #f1f2f3;
border: none;
```

### outlined
Card with border only, no shadow.

```css
border: 2px solid #e0e6ed;
background: white;
```

## Grid Layout System

The component uses CSS Grid to position columns dynamically:

- **grid_columns**: Defines the number of columns in the grid (e.g., 4 creates a 4-column layout)
- **grid_rows**: Defines the number of rows in the grid (e.g., 4 creates a 4-row layout)
- **col_span**: How many columns a field occupies (1-grid_columns)
- **row_span**: How many rows a field occupies (1-grid_rows)

### Example Layouts

#### 2-Column Layout
```json
{
  "grid_columns": 2,
  "grid_rows": 3,
  "columns": [
    { "field_name": "name", "col_span": 2, "row_span": 1 },
    { "field_name": "email", "col_span": 1, "row_span": 1 },
    { "field_name": "phone", "col_span": 1, "row_span": 1 },
    { "field_name": "status", "col_span": 2, "row_span": 1 }
  ]
}
```

#### 4-Column Layout
```json
{
  "grid_columns": 4,
  "grid_rows": 2,
  "columns": [
    { "field_name": "code", "col_span": 1, "row_span": 1 },
    { "field_name": "name", "col_span": 2, "row_span": 1 },
    { "field_name": "status", "col_span": 1, "row_span": 1 },
    { "field_name": "description", "col_span": 4, "row_span": 1 }
  ]
}
```

## WhatsApp-Style Action Handling

The mobile view uses a WhatsApp-like interaction pattern:

1. **Click card** → Card becomes selected (blue border, check icon)
2. **Action bar appears** at top with available actions
3. **Click action** → Performs action and deselects card
4. **Click same card again** → Deselects

### Action Sources

Actions can come from two sources:

#### 1. API Response (Recommended)
Backend includes `available_actions` array in each row:

```json
{
  "id": 1,
  "name": "John Doe",
  "status": "active",
  "available_actions": [
    {
      "action_type": "view",
      "icon": "fa-regular fa-eye",
      "label": "View"
    },
    {
      "action_type": "edit",
      "icon": "fa-regular fa-pen-to-square",
      "label": "Edit"
    }
  ]
}
```

#### 2. Permissions Fallback
If no `available_actions` in row, actions are built from permissions:

```typescript
{
  permissions: {
    details: true,  // Adds "View" action
    edit: true,     // Adds "Edit" action
    delete: true    // Adds "Delete" action
  }
}
```

### Action Types

Standard action types from `commonConfig.ACTION_TYPE`:
- `view` / `details` - View details
- `edit` - Edit record
- `delete` - Delete record
- `export_pdf` - Export to PDF
- `export_excel` - Export to Excel
- `share` - Share (uses Capacitor Share plugin on mobile)

## Field Name Resolution

The component resolves field values using dot notation:

### Simple Fields
```json
{ "field_name": "name" }
// Accesses: item.name
```

### Nested Fields
```json
{ "field_name": "user_information.email" }
// Accesses: item.user_information.email
```

### SQL Expressions
```json
{ "field_name": "STRING_AGG(roles.name, ', ')" }
// Accesses: item["STRING_AGG(roles.name, ', ')"]
```

## Backward Compatibility

The mobile-list component maintains backward compatibility:

- **With config**: Uses dynamic grid-based card layout with WhatsApp-style actions
- **Without config**: Falls back to original list layout with inline action buttons

```typescript
get hasMobileViewConfig(): boolean {
  return !!(this.mobileViewConfig?.view_type === 'card' && 
            this.mobileViewConfig?.card?.row?.columns);
}
```

## Usage in Components

### Master List Component
Passes configuration to mobile-list:

```html
<app-mobile-list
  [masterInfo]="masterInfo"
  [headercolumns]="headercolumns"
  [items]="items"
  [mobileViewConfig]="masterInfo?.entity_configurations?.mobile_view"
  (view)="viewItem($event)"
  (edit)="editItem($event)"
  (delete)="deleteItem($event)"
></app-mobile-list>
```

### Mobile List Component
Receives and applies configuration:

```typescript
@Input() mobileViewConfig: any = null;

get hasMobileViewConfig(): boolean {
  return !!(this.mobileViewConfig?.view_type === 'card');
}

get mobileCardColumns(): any[] {
  return this.mobileViewConfig?.card?.row?.columns || [];
}
```

## Example Complete Configuration

```json
{
  "mobile_view_type": "card",
  "mobile_view": {
    "view_type": "card",
    "card": {
      "style": "elevated",
      "shape": "rounded",
      "grid_columns": 4,
      "grid_rows": 4,
      "row": {
        "row_no": 1,
        "divider_after": true,
        "columns": [
          {
            "field_name": "user_information.code",
            "label": "Code",
            "type": "text",
            "col_span": 1,
            "row_span": 1,
            "align": "left",
            "show_label": true
          },
          {
            "field_name": "user_information.full_name",
            "label": "Name",
            "type": "text",
            "col_span": 2,
            "row_span": 1,
            "align": "left",
            "show_label": true
          },
          {
            "field_name": "user_information.status_id",
            "label": "Status",
            "type": "badge",
            "col_span": 1,
            "row_span": 1,
            "align": "center",
            "show_label": false
          },
          {
            "field_name": "user_information.email",
            "label": "Email",
            "type": "text",
            "col_span": 2,
            "row_span": 1,
            "align": "left",
            "show_label": true
          },
          {
            "field_name": "user_information.full_phone_number",
            "label": "Phone",
            "type": "text",
            "col_span": 2,
            "row_span": 1,
            "align": "left",
            "show_label": true
          },
          {
            "field_name": "STRING_AGG(roles.name, ', ')",
            "label": "Roles",
            "type": "text",
            "col_span": 4,
            "row_span": 1,
            "align": "left",
            "show_label": true
          }
        ]
      }
    }
  }
}
```

## Mobile Platform Support

### Capacitor Integration
The component works seamlessly with Capacitor on iOS and Android:

- Uses standard HTML/CSS (same as web)
- Touch events work natively
- Responsive design adapts to screen sizes
- WhatsApp-style action bar is touch-optimized

### Testing
Test on actual devices or emulators:

```bash
# Android
npm run cap:android

# iOS (requires macOS)
npm run cap:ios
```

## Benefits

1. **Dynamic Layout**: No hardcoding - cards adapt to configuration
2. **Flexible Grid**: Position fields anywhere with col_span/row_span
3. **WhatsApp UX**: Familiar interaction pattern for mobile users
4. **API-Driven Actions**: Backend controls which actions are available
5. **Type Safety**: TypeScript interfaces ensure type safety
6. **Backward Compatible**: Works with or without configuration
7. **Platform Agnostic**: Same code works on web, iOS, and Android

## Migration from Old Pattern

### Before (Hardcoded)
```html
<div class="card">
  <div>{{ item.name }}</div>
  <div>{{ item.email }}</div>
  <button (click)="onEdit(item)">Edit</button>
</div>
```

### After (Dynamic)
```html
<div class="card-grid">
  @for (column of mobileCardColumns; track column.field_name) {
    <div [style.grid-area]="getColumnGridArea(column)">
      {{ getColumnValue(item, column) }}
    </div>
  }
</div>
```

## Best Practices

1. **Use 4-column grid** for most layouts (good balance)
2. **Span full width** for long text fields (col_span: 4)
3. **Hide labels** for obvious fields (show_label: false)
4. **Use badges** for status fields (type: "badge")
5. **Right-align** numbers and amounts (align: "right")
6. **Test on devices** before deploying
7. **Keep it simple** - avoid too many fields per card

## Troubleshooting

### Card not showing
- Check `mobile_view_type` is `"card"`
- Verify `mobile_view.view_type` is `"card"`
- Ensure `columns` array has items

### Fields not appearing
- Check `field_name` matches data structure
- Use dot notation for nested fields
- Verify field exists in API response

### Layout broken
- Check col_span doesn't exceed grid_columns
- Ensure row_span doesn't exceed grid_rows
- Verify grid CSS is loaded

### Actions not working
- Check permissions in masterInfo
- Verify action_type values are correct
- Check event handlers are wired up
