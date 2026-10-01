Saving State & Toast UX Design Pattern
Core Philosophy
The goal is to provide immediate, clear, and reassuring feedback to the user without interrupting their workflow. When dealing with database writes, UI blocking should be strictly localized (button level) rather than global (page-level overlays).

Implementation Breakdown
1. The Button Transformation
We transition the button from a static action state to an actively-processing state.

Visual Cue: The checkmark (<Check />) is smoothly replaced by an animated spinning loader (<Loader2 animate-spin />).
Text Change: "Save Edit" becomes "Saving...".
Interaction Lock: The button is instantly disabled (disabled={savingStates[activeVersion.id]}) preventing double-submissions and accidental spam.
2. The Sonner Toast Integration
We use sonner to handle the floating toasts. Sonner allows for an incredibly sleek "Promise/Loading" mutation pattern:

Instant Loading Toast: The moment the user clicks, toast.loading("Saving changes...") is fired. This creates a persistent but non-intrusive floating popup on the screen.
Dynamic ID Update: We capture the unique ID of that exact toast (const loadingToast = toast.loading(...)).
Success Resolution: When the database successfully replies, we don't spawn a second toast. Instead, we mutate the original one! toast.success("Changes saved successfully!", { id: loadingToast }). This seamlessly transforms the spinning circle in the toast into a green checkmark.
Error Handling: If the API fails, the toast morphs into a red error message: toast.error("Failed to save changes", { id: loadingToast }).
3. Granular React State Management
We use a dictionary-based state (Record<string, boolean>) instead of a simple boolean (true/false) for savingStates.

Why?: Because the UI contains multiple tabs and sections (LinkedIn, X, Instagram). If we used a single global boolean, clicking "Save" on LinkedIn would accidentally show a spinning loader on the hidden Twitter tab as well. By mapping the state to the exact version ID (savingStates[version.id] = true), we ensure the loading state is hyper-localized exclusively to the piece of content actually being saved.
Code Example
tsx

// 1. Trigger the loading toast
const loadingToast = toast.loading("Saving changes...");
setSavingStates((prev) => ({ ...prev, [version.id]: true }));
try {
  // 2. Perform the API call
  await fetch('/api/...');
  
  // 3. Morph the toast to Success
  toast.success("Changes saved successfully!", { id: loadingToast });
} catch (error) {
  // 4. Morph the toast to Error
  toast.error("Failed to save changes", { id: loadingToast });
} finally {
  // 5. Unlock the button
  setSavingStates((prev) => ({ ...prev, [version.id]: false }));
}
