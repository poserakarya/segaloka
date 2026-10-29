# Segaloka Asset Architecture

This directory defines the canonical asset contract used by the
Segaloka ecosystem.

Consumers:

- Segaloka Website
- Traveler Mobile App
- Travel Dashboard
- Vendor Dashboard
- Affiliate / Agent / Partner surfaces
- Control Center

## Rule

Static platform assets may live under:

public/images/

Dynamic business assets must eventually use the central storage
and asset registry.

Do not duplicate uploaded package, travel, vendor, user, or
document assets between applications.

## Canonical domains

- brand
- hero
- categories
- packages
- destinations
- travel
- vendors
- accommodation
- attractions
- promo
- segadeals
- affiliate
- help-center
- payments
- documents
- avatars
- placeholders

## Storage

Canonical buckets:

- public-content
- travel-assets
- vendor-assets
- package-assets
- user-private
- documents-private

The bucket names and path conventions are shared contracts.
Website, mobile applications, and dashboards must not create
their own incompatible storage conventions.

## Important

The current local /public assets are transitional.

Dynamic assets will be migrated to Supabase Storage after the
database/storage/RLS contract is implemented and verified.
