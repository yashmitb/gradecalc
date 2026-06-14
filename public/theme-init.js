(function () {
  try {
    var p = localStorage.getItem("gradehq.theme.v1");
    var d = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var r = p === "light" || p === "dark" ? p : d ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", r);
  } catch {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
