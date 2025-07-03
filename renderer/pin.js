let isPinned = false;
async function togglePin() {
  isPinned = !isPinned;
  await window.api.setAlwaysOnTop(isPinned);

  const pin = document.querySelector(".pin-toggle");
  if (isPinned) {
    pin.classList.add("pinned");
  } else {
    pin.classList.remove("pinned");
  }
}
