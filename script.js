const pad = (value) => String(value).padStart(2, "0");

function getNextMasterclassDate() {
  const now = new Date();
  const target = new Date(now);
  const targetDay = 3; // Wednesday
  const currentDay = target.getDay();
  let daysUntil = (targetDay - currentDay + 7) % 7;

  // 7PM UK shown as UTC for a simple static landing page countdown.
  target.setUTCHours(19, 0, 0, 0);
  if (daysUntil === 0 && target <= now) daysUntil = 7;
  target.setUTCDate(target.getUTCDate() + daysUntil);
  return target;
}

const masterclassDate = getNextMasterclassDate();
const dateFormatter = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "short",
  day: "numeric"
});

const bannerDate = document.getElementById("bannerDate");
const weekdayDate = document.getElementById("weekdayDate");
const summaryDate = document.getElementById("summaryDate");
const displayDate = dateFormatter.format(masterclassDate);

if (bannerDate) bannerDate.textContent = displayDate;
if (weekdayDate) weekdayDate.textContent = displayDate;
if (summaryDate) summaryDate.textContent = displayDate;

const countdownIds = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds")
};

function updateCountdown() {
  const now = new Date();
  const distance = Math.max(masterclassDate - now, 0);
  const secondsTotal = Math.floor(distance / 1000);
  const days = Math.floor(secondsTotal / 86400);
  const hours = Math.floor((secondsTotal % 86400) / 3600);
  const minutes = Math.floor((secondsTotal % 3600) / 60);
  const seconds = secondsTotal % 60;

  countdownIds.days.textContent = pad(days);
  countdownIds.hours.textContent = pad(hours);
  countdownIds.minutes.textContent = pad(minutes);
  countdownIds.seconds.textContent = pad(seconds);
}

updateCountdown();
setInterval(updateCountdown, 1000);

const registrationForm = document.getElementById("registrationForm");

if (registrationForm) {
  registrationForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const requiredFields = Array.from(registrationForm.querySelectorAll("input[required]"));
    const hasEmpty = requiredFields.some((field) => !field.value.trim());
    const email = registrationForm.querySelector("#email");
    const emailValid = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());

    requiredFields.forEach((field) => {
      const invalid = !field.value.trim() || (field.type === "email" && !emailValid);
      field.style.borderColor = invalid ? "rgba(255, 108, 125, .78)" : "rgba(31, 226, 138, .44)";
    });

    if (hasEmpty || !emailValid) return;

    registrationForm.classList.add("success");
    registrationForm.reset();
  });
}

const reveals = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });

reveals.forEach((element) => observer.observe(element));
