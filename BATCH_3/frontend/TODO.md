# Task: Allow Manual Doctor Selection in Appointment Booking

## Goal
Modify the booking system to allow users to manually select a doctor instead of automatic assignment.

## Current State
- Doctor field is readonly and auto-filled from URL params.
- No dropdown for doctor selection.

## Plan
1. Update booking.html:
   - Change doctor field from readonly input to select dropdown.
   - Add script to fetch and populate doctors list.
   - Make doctor selection required.
   - Update JavaScript to handle doctor selection and enable date/time after selection.

2. Test the changes:
   - Ensure doctors load correctly.
   - Verify form submission works with selected doctor.

## Files to Edit
- booking.html: Form field and JavaScript logic.

## Followup Steps
- Test booking flow.
- Ensure compatibility with existing API.
