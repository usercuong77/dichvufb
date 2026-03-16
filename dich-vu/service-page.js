(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealEls = Array.from(document.querySelectorAll("[data-reveal]"));

    if (reduceMotion) {
        revealEls.forEach((el) => el.classList.add("active"));
    } else {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("active");
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        revealEls.forEach((el) => {
            el.classList.add("reveal");
            observer.observe(el);
        });
    }

    if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
    }

    const form = document.getElementById("serviceLeadForm");
    const statusEl = document.getElementById("leadFormStatus");
    if (!form || !statusEl) return;

    const serviceSelect = form.querySelector('select[name="lead_service"]');
    const defaultService = form.dataset.service || "";
    if (serviceSelect && defaultService) {
        serviceSelect.value = defaultService;
    }

    const LEAD_DELIVERY_CONFIG = {
        // Keep this exactly aligned with the homepage lead flow.
        webhookUrl: "https://script.google.com/macros/s/AKfycbztTRTV_lJwa7V-dNg-LJUq0QV5C_0UXNL2bQbQntq_p7AZidNf-MrYte_-XLBdBmgx/exec",
        webhookMethod: "POST",
        webhookRequestMode: "cors",
        notifyViaTelegram: true
    };

    const hasWebhookUrl = () => Boolean((LEAD_DELIVERY_CONFIG.webhookUrl || "").trim());

    const showStatus = (message, type) => {
        statusEl.textContent = message;
        statusEl.className = `status-msg show ${type}`;
    };

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const defaultSubmitLabel = submitBtn ? submitBtn.textContent.trim() : "";

        const name = document.getElementById("leadName")?.value?.trim() || "";
        const phone = document.getElementById("leadPhone")?.value?.trim() || "";
        const service = document.getElementById("leadService")?.value?.trim() || defaultService;
        const urgency = document.getElementById("leadUrgency")?.value?.trim() || "";
        const note = document.getElementById("leadNote")?.value?.trim() || "";

        if (!name || !phone || !service) {
            showStatus("Vui long nhap du Ho ten, So dien thoai va Dich vu can ho tro.", "error");
            return;
        }

        if (!hasWebhookUrl()) {
            showStatus("Kenh tiep nhan tam thoi chua san sang. Vui long goi truc tiep 0972.026.482.", "error");
            return;
        }

        const leadPayload = {
            source: "lamquoccuong.com",
            formId: "quickLeadForm",
            submittedAt: new Date().toISOString(),
            notifyViaTelegram: LEAD_DELIVERY_CONFIG.notifyViaTelegram,
            name,
            phone,
            service
        };
        if (urgency) leadPayload.urgency = urgency;
        if (note) leadPayload.note = note;

        // Optional preformatted message for backend Telegram notification.
        const messageLines = [
            "CASE MOI - LAM QUOC CUONG",
            `Ho ten: ${name}`,
            `So dien thoai: ${phone}`,
            `Dich vu can ho tro: ${service}`
        ];
        if (urgency) messageLines.push(`Muc do khan: ${urgency}`);
        if (note) messageLines.push(`Mo ta tinh trang: ${note}`);
        leadPayload.telegramMessage = messageLines.join("\n");

        const leadPayloadAsJson = JSON.stringify(leadPayload);

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.classList.add("opacity-80", "cursor-not-allowed");
                submitBtn.textContent = "Dang gui...";
            }

            const isGoogleAppsScript = LEAD_DELIVERY_CONFIG.webhookUrl.includes("script.google.com");
            const requestMode = LEAD_DELIVERY_CONFIG.webhookRequestMode || (isGoogleAppsScript ? "no-cors" : "cors");
            const webhookResponse = await fetch(LEAD_DELIVERY_CONFIG.webhookUrl, {
                method: LEAD_DELIVERY_CONFIG.webhookMethod || "POST",
                headers: {
                    "Content-Type": "text/plain;charset=UTF-8"
                },
                body: leadPayloadAsJson,
                mode: requestMode,
                keepalive: true
            });

            if (requestMode !== "no-cors" && !webhookResponse.ok) {
                throw new Error(`Webhook status ${webhookResponse.status}`);
            }

            if (requestMode !== "no-cors") {
                let webhookPayload = null;
                try {
                    webhookPayload = await webhookResponse.json();
                } catch (_) {
                    webhookPayload = null;
                }
                if (webhookPayload && webhookPayload.ok === false) {
                    throw new Error(webhookPayload.error || "Webhook returned ok=false");
                }
            }

            showStatus("Da gui case thanh cong. Minh da nhan thong tin va se lien he lai som.", "success");
            form.reset();
            if (serviceSelect && defaultService) {
                serviceSelect.value = defaultService;
            }
        } catch (error) {
            console.error("Lead webhook submit failed:", error);
            showStatus("Chua gui duoc case. Ban vui long thu lai hoac goi hotline 0972.026.482.", "error");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove("opacity-80", "cursor-not-allowed");
                submitBtn.textContent = defaultSubmitLabel || "Gui yeu cau ngay";
            }
        }
    });
})();
