// Wait for the DOM to finish loading
document.addEventListener("DOMContentLoaded", function () {
  const landing = document.getElementById("landing");
  const mainContent = document.getElementById("main-content");
  const enterButton = document.getElementById("enter-button");

  // Check if user has visited before
  const hasVisited = localStorage.getItem("hasVisited");

  if (hasVisited) {
    // Skip landing page
    landing.style.display = "none";
    mainContent.style.display = "block";
  } else {
    // Show landing page on first visit
    landing.style.display = "flex"; // or block, depending on your styling
    mainContent.style.display = "none";

    enterButton.addEventListener("click", () => {
      // Set flag to remember the user
      localStorage.setItem("hasVisited", "true");

      // Hide landing, show main content
      landing.style.display = "none";
      mainContent.style.display = "block";
    });
  }
});
