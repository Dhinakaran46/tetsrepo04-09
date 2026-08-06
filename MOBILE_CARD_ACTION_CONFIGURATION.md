# Mobile Card Action Configuration Guide

## Overview

Mobile card actions are configured using standard `ACTION_TYPE` values from `common.config.ts`. This ensures consistency across web, mobile responsive, and native mobile applications.

## Standard Action Types

All actions reference `commonConfig.ACTION_TYPE`:

### Primary Actions

- `view` - View record details
- `edit` - Edit record
- `delete` - Delete record
- `add` - Add new record

### Detail Actions

- `details` - View detailed information
- `child_details` - View child/related records

### Popup Actions

- `popup_add` - Add in popup/modal
- `popup_edit` - Edit in popup/modal
- `popup_details` - Details in popup/modal

### Export/Import Actions

- `export_excel` - Export to Excel
- `export_pdf` - Export to PDF
- `record_export` - Export single record
- `import` - Import records

### Communication Actions

- `email_resend` - Resend email
- `share` - Share via native share (mobile only)

### Utility Actions

- `assign` - Assign to user/role
- `print` - Print record
- `generate_vector` - Generate AI embeddings
- `reset_password` - Reset user password
- `get_code` - Get QR/barcode

## Configuration Examples

### 1. Basic Mobile Card (View, Edit, Delete)

```json
{
  "view_type": "card",
  "card": {
    "style": "elevated",
    "shape": "rounded",
    "rows": [
      {
        "row_no": 1,
        "divider_after": true,
        "columns": [
          {
            "field_name": "name",
            "label": "Name",
            "type": "text",
            "col_span": 2,
            "row_span": 1,
            "align": "left"
          },
          {
            "field_name": null,
            "label": "Actions",
            "type": "action",
            "col_span": 2,
            "row_span": 1,
            "align": "right",
            "show_label": false,
            "action": {
              "actions": ["view", "edit", "delete"]
            }
          }
        ]
      }
    ]
  }
}
```

### 2. Mobile Card with Export Actions

```json
{
  "field_name": null,
  "label": "Actions",
  "type": "action",
  "col_span": 2,
  "row_span": 1,
  "align": "right",
  "show_label": false,
  "action": {
    "actions": ["view", "export_excel", "export_pdf", "share"]
  }
}
```

### 3. Mobile Card with Popup Actions

```json
{
  "field_name": null,
  "label": "Quick Actions",
  "type": "action",
  "col_span": 2,
  "row_span": 1,
  "align": "right",
  "show_label": false,
  "action": {
    "actions": ["popup_details", "popup_edit", "delete"]
  }
}
```

### 4. Mobile Card with Child Details

```json
{
  "field_name": null,
  "label": "Actions",
  "type": "action",
  "col_span": 2,
  "row_span": 1,
  "align": "right",
  "show_label": false,
  "action": {
    "actions": ["view", "child_details", "edit"]
  }
}
```

### 5. Mobile Card for User Management

```json
{
  "field_name": null,
  "label": "User Actions",
  "type": "action",
  "col_span": 2,
  "row_span": 1,
  "align": "right",
  "show_label": false,
  "action": {
    "actions": ["view", "edit", "reset_password", "assign"]
  }
}
```

## Icon Mapping

The system automatically maps ACTION_TYPE to Font Awesome icons:

| Action Type       | Icon                         | Description    |
| ----------------- | ---------------------------- | -------------- |
| `view`            | fa-regular fa-eye            | View details   |
| `edit`            | fa-regular fa-pen-to-square  | Edit record    |
| `delete`          | fa-regular fa-trash-can      | Delete record  |
| `add`             | fa-solid fa-plus             | Add new        |
| `details`         | fa-regular fa-file-lines     | View details   |
| `child_details`   | fa-solid fa-sitemap          | View children  |
| `popup_add`       | fa-solid fa-square-plus      | Add in popup   |
| `popup_edit`      | fa-regular fa-pen-to-square  | Edit in popup  |
| `popup_details`   | fa-regular fa-rectangle-list | Details popup  |
| `export_excel`    | fa-regular fa-file-excel     | Excel export   |
| `export_pdf`      | fa-regular fa-file-pdf       | PDF export     |
| `record_export`   | fa-solid fa-download         | Download       |
| `import`          | fa-solid fa-upload           | Upload         |
| `email_resend`    | fa-regular fa-envelope       | Email          |
| `share`           | fa-solid fa-share-nodes      | Share          |
| `assign`          | fa-solid fa-user-plus        | Assign         |
| `print`           | fa-solid fa-print            | Print          |
| `generate_vector` | fa-solid fa-brain            | AI Generate    |
| `reset_password`  | fa-solid fa-key              | Reset Password |
| `get_code`        | fa-solid fa-qrcode           | QR Code        |

## Permission-Based Action Filtering

In production, filter actions based on user permissions:

```typescript
// Example runtime filtering
const availableActions = actionConfig.actions.filter((action) => {
  const permissionSlug = `${action}_${entityName}`;
  return this.hasPermission(permissionSlug);
});
```

## Mobile vs Web Behavior

### Responsive Web

- Actions render as icon buttons
- Hover states show tooltips
- Click navigates or opens modal

### Native Mobile (Capacitor)

- Same HTML/CSS renders in WebView
- Touch interactions instead of hover
- Native share uses Capacitor Share plugin:

  ```typescript
  import { Share } from '@capacitor/share';

  if (action === 'share') {
    await Share.share({
      title: row.title,
      text: row.description,
      url: window.location.href,
      dialogTitle: 'Share Item',
    });
  }
  ```

## Best Practices

### 1. Action Order

Place most common actions first (left to right):

```json
["view", "edit", "delete"]  // ✓ Good: Common pattern
["delete", "view", "edit"]  // ✗ Bad: Destructive action first
```

### 2. Action Count

- **Mobile**: 3-4 actions maximum
- **Tablet**: 4-6 actions
- **Desktop**: 5+ actions acceptable

### 3. Contextual Actions

Match actions to entity type:

- **Users**: `["view", "edit", "reset_password", "assign"]`
- **Documents**: `["view", "export_pdf", "share", "delete"]`
- **Orders**: `["view", "child_details", "export_excel", "print"]`

### 4. Popup vs Navigation

- Use `popup_*` actions for quick edits
- Use regular actions for complex workflows
- Configure via `link_mode` in entity configuration

## Entity Configurations Integration

The mobile card config syncs with `entity_configurations.mobile_card_view`:

```json
{
  "grid_show_title": "yes",
  "grid_enable_sticky_header": "yes",
  "mobile_view_type": "card",
  "mobile_card_view": {
    "view_type": "card",
    "card": {
      "style": "elevated",
      "shape": "rounded",
      "rows": [
        {
          "row_no": 1,
          "divider_after": true,
          "columns": [
            ,
            /* ... other columns ... */ {
              "field_name": null,
              "type": "action",
              "action": {
                "actions": ["view", "edit", "delete"]
              }
            }
          ]
        }
      ]
    }
  }
}
```

## Testing Actions

### Preview Mode

1. Open Mobile Card Builder
2. Click Preview icon
3. Test action icons in preview modal
4. Check console logs for action data

### Development Mode

1. Configure actions in builder
2. Save entity
3. Test in actual mobile list/card view
4. Verify permissions filter correctly

### Production Testing

1. Test on desktop browser (responsive mode)
2. Test on mobile browser (real device)
3. Test in native app (Capacitor iOS/Android)
4. Verify native features (share, etc.) work correctly
