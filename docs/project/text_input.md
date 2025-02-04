# Multiline Text Input Implementation Plan

## Phase 1: Switch to Textarea

1. First check:
   - Can we find a textarea component in the existing UI library?
   - If not, do we need to create one?
   - CHECKPOINT: Show component choice before making any changes

## Phase 2: Basic Implementation

1. Update ChatInput.tsx:
   - Change to textarea component
   - Keep all existing props/functionality
   - CHECKPOINT: Show proposed changes before making them
   - CHECKPOINT: Test that basic input still works as before

## Phase 3: Add Shift+Enter

1. Add keyboard handling:

   - Add simple detection of Shift+Enter
   - Test it logs correctly
   - CHECKPOINT: Verify detection works before adding any behavior

2. Implement newline behavior:
   - Add newline on Shift+Enter
   - Keep normal Enter for submission
   - CHECKPOINT: Test both behaviors work

## Phase 4: Styling

1. Match current design:
   - Ensure height adjusts properly
   - Keep current visual style
   - CHECKPOINT: Compare visuals with current version

## Phase 5: Final Testing

1. Verify everything works:
   - Regular submission
   - Multiline input
   - Visual appearance
   - CHECKPOINT: Full review before pushing
