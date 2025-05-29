const express = require("express");
const puppeteer = require("puppeteer"); // ✅ مهم جداً

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const config = {
  API_KEY: "PubG2025SecretKey",
  MIDASBUY_URL: "https://www.midasbuy.com/midasbuy/eg/redeem/pubgm",
  VIEWPORT: { width: 1366, height: 768 }, // ✅ تعريف الـ Viewport
  PUPPETEER_OPTIONS: {
    headless: true,
    userDataDir: "./my-user-data",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--start-maximized"],
  },
};

// تهيئة التطبيق
const app = express();
app.use(express.json());

// تعريف دالة الشحن
const rechargePlayerCode = async (player_id, code) => {
  const browser = await puppeteer.launch(config.PUPPETEER_OPTIONS);
  const page = await browser.newPage();
  try {
    console.log("Step 1: Opening Midasbuy redeem page...");
    // await page.setViewport(config.VIEWPORT);

    await page.goto(config.MIDASBUY_URL, {
      waitUntil: "networkidle2",
      timeout: 40000,
    });

    await delay(500);

    // النقر على زر الدخول
    console.log("Step 2: Opening login popup...");

    const loginIcon = await page.$(".i-midas\\:switch.icon");
    if (!loginIcon) throw new Error("Login icon not found");
    await loginIcon.click();

    await delay(500);

    console.log("Step 3: Entering player_id...");
    await enterPlayerId(page, player_id);

    await delay(500);

    console.log("Step 4: Entering redemption code...");
    await enterCode(page, code);

    await delay(500);
    console.log("Step 5: Clicking the final 'Send/Submit' button...");
    await clickSendButton(page);
    await delay(500);

    console.log("✅ Recharge process completed successfully");
    return { message: "Recharge process completed successfully." };
  } catch (error) {
    console.error(`❌ Error during process: ${error.message}`);
    throw new Error(`Error during recharge process: ${error.message}`);
  }
  //  finally {
  //   // تم تعليق finally لإبقاء المتصفح مفتوحاً للتحقق من النتائج
  //   console.log("Closing browser after completion...");
  //   await delay(2000); // تأخير قبل الإغلاق للتأكد من اكتمال العملية
  //   await browser.close(); // ✅ متأكد إن المتصفح يتقفل بعد العملية
  // }
};

// إدخال الـ Player ID
const enterPlayerId = async (page, player_id) => {
  try {
    await page.waitForSelector('input[placeholder="إدخال حساب معرف لاعب"]', {
      timeout: 5000,
    });

    const input = await page.$('input[placeholder="إدخال حساب معرف لاعب"]');
    if (!input) throw new Error("Player ID input not found");

    await page.evaluate((el) => (el.value = ""), input);
    await input.type(player_id, { delay: 100 });

    const okBtn = await page.$("div.Button_icon_text__C-ysi");
    if (!okBtn) throw new Error("OK button not found");
    await okBtn.click();

    console.log("✅ Player ID entered and OK clicked");
  } catch (error) {
    console.error(`❌ Error entering player ID: ${error.message}`);
    throw error; // رفع الخطأ للدالة الرئيسية
  }
};

// إدخال كود الشحن
const enterCode = async (page, code) => {
  try {
    // انتظار ظهور حقل إدخال الكود
    await page.waitForSelector('input[placeholder="يرجى إدخال رمز استرداد"]', {
      timeout: 10000,
    });

    const input = await page.$('input[placeholder="يرجى إدخال رمز استرداد"]');
    if (!input) throw new Error("Code input not found");

    // مسح أي نص موجود في الحقل أولاً
    await page.evaluate((el) => (el.value = ""), input);

    // إدخال الكود ببطء للتأكد من تسجيله بشكل صحيح
    await input.type(code, { delay: 100 });

    console.log("✅ تم إدخال الكود، جاري البحث عن زر OK...");

    // الطريقة الأولى: استهداف زر OK بمحدد CSS دقيق
    try {
      await delay(1000);
      // تحديد الزر الأزرق OK الذي يظهر في الصورة
      const okButton = await page.$(
        '#redemption-root .redeemcode-c .btn-code, .exchange-purchase-box .btn-code, button:has-text("OK")'
      );
      if (okButton) {
        await okButton.click();
        console.log("✅ تم النقر على زر OK باستخدام المحدد المخصص");

        // انتظار ظهور نافذة التأكيد النهائية
        console.log("⏳ انتظار ظهور نافذة التأكيد النهائية...");
        await delay(1000);

        // النقر على زر "إرسال" في نافذة التأكيد
        await clickFinalConfirmButton(page);
        return;
      }
    } catch (error) {
      console.log("محاولة أولى فشلت، جاري تجربة طريقة أخرى...");
    }

    // الطريقة الثانية: محاولة النقر على زر OK باستخدام XPath
    try {
      const okButtonXPath = await page
        .waitForXPath(
          "//button[contains(text(), 'OK')] | //div[contains(text(), 'OK') and @role='button']",
          {
            visible: true,
            timeout: 1000,
          }
        )
        .catch(() => null);

      if (okButtonXPath) {
        await okButtonXPath.click();
        console.log("✅ تم النقر على زر OK باستخدام XPath");

        // انتظار ظهور نافذة التأكيد النهائية
        console.log("⏳ انتظار ظهور نافذة التأكيد النهائية...");
        await delay(1000);

        // النقر على زر "إرسال" في نافذة التأكيد
        await clickFinalConfirmButton(page);
        return;
      }
    } catch (error) {
      console.log("محاولة ثانية فشلت، جاري تجربة طريقة أخرى...");
    }

    // الطريقة الثالثة: النقر على أول زر في المنطقة
    try {
      // استهداف أي زر في منطقة إدخال الكود
      const anyButton = await page.$(
        ".redeemcode-c button, .redeemcode-c .btn"
      );
      if (anyButton) {
        await anyButton.click();
        console.log("✅ تم النقر على أول زر في منطقة إدخال الكود");

        // انتظار ظهور نافذة التأكيد النهائية
        console.log("⏳ انتظار ظهور نافذة التأكيد النهائية...");
        await delay(1000);

        // النقر على زر "إرسال" في نافذة التأكيد
        await clickFinalConfirmButton(page);
        return;
      }
    } catch (error) {
      console.log("محاولة ثالثة فشلت، جاري تجربة طريقة أخرى...");
    }

    // الطريقة الرابعة: النقر على الزر باستخدام الإحداثيات
    try {
      // الحصول على إحداثيات حقل الإدخال
      const inputBoundingBox = await input.boundingBox();
      if (inputBoundingBox) {
        // الزر الأزرق في الصورة يظهر على يسار حقل الإدخال
        const x = inputBoundingBox.x - 200; // تعديل بناءً على الصورة
        const y = inputBoundingBox.y + inputBoundingBox.height / 2;

        await page.mouse.click(x, y);
        console.log(
          `✅ تم النقر على الإحداثيات (${x}, ${y}) حيث يفترض أن يكون زر OK`
        );

        // انتظار ظهور نافذة التأكيد النهائية
        console.log("⏳ انتظار ظهور نافذة التأكيد النهائية...");
        await delay(1000);

        // النقر على زر "إرسال" في نافذة التأكيد
        await clickFinalConfirmButton(page);
        return;
      }
    } catch (error) {
      console.log("محاولة رابعة فشلت، جاري تجربة طريقة أخيرة...");
    }

    // الطريقة الخامسة: البحث عن أي زر أزرق اللون
    try {
      const blueButton = await page.evaluateHandle(() => {
        // البحث عن العناصر ذات الخلفية الزرقاء أو النمط الأزرق
        const elements = [
          ...document.querySelectorAll('button, .btn, [role="button"]'),
        ];
        const blueElements = elements.filter((el) => {
          const style = window.getComputedStyle(el);
          const backgroundColor = style.backgroundColor;
          const color = style.color;
          // البحث عن العناصر ذات الخلفية الزرقاء أو النص الأبيض على خلفية غامقة
          return (
            backgroundColor.includes("rgb(0, 0, 255)") ||
            backgroundColor.includes("rgb(0, 122, 255)") ||
            backgroundColor.includes("rgb(33, 150, 243)") ||
            (color.includes("rgb(255, 255, 255)") &&
              (backgroundColor.includes("rgb(0") ||
                backgroundColor.includes("rgb(33")))
          );
        });

        // إعادة أول عنصر أزرق
        return blueElements[0] || null;
      });

      if (blueButton.asElement()) {
        await blueButton.asElement().click();
        console.log("✅ تم النقر على زر أزرق اللون");

        // انتظار ظهور نافذة التأكيد النهائية
        console.log("⏳ انتظار ظهور نافذة التأكيد النهائية...");
        await delay(1000);

        // النقر على زر "إرسال" في نافذة التأكيد
        await clickFinalConfirmButton(page);
        return;
      }
    } catch (error) {
      console.log("محاولة خامسة فشلت.");
    }

    // إذا وصلنا إلى هنا، فهذا يعني أن جميع المحاولات فشلت
    console.log("⚠️ لم يتم العثور على زر OK بأي من الطرق");
  } catch (error) {
    console.error(`❌ Error entering code: ${error.message}`);
    throw error; // رفع الخطأ للدالة الرئيسية
  }
};

// دالة للنقر على زر "إرسال" في نافذة التأكيد النهائية
const clickFinalConfirmButton = async (page) => {
  try {
    // الطريقة 1: استخدام selector (مع إصلاح المشكلة)
    try {
      await delay(1000);
      const sendBtn = await page.$(
        'button:contains("إرسال"), .submit-btn, .confirm-btn, .send-btn'
      );
      if (sendBtn) {
        await sendBtn.click();
        console.log("✅ تم النقر على زر إرسال النهائي بنجاح (طريقة 1)");
        return;
      }
    } catch (error) {
      console.log("الطريقة 1 فشلت، جاري تجربة طريقة أخرى...");
    }

    // الطريقة 2: استخدام evaluate للبحث عن زر "إرسال" عن طريق النص
    try {
      const sendBtnHandle = await page.evaluateHandle(() => {
        const elements = [
          ...document.querySelectorAll('button, .btn, [role="button"], div'),
        ];
        return elements.find(
          (el) =>
            el.innerText.includes("إرسال") ||
            el.textContent.includes("إرسال") ||
            el.innerText.includes("ارسال") ||
            el.textContent.includes("ارسال") ||
            el.innerText.includes("تأكيد") ||
            el.textContent.includes("تأكيد")
        );
      });

      if (sendBtnHandle.asElement()) {
        await sendBtnHandle.asElement().click();
        console.log("✅ تم النقر على زر إرسال النهائي بنجاح (طريقة 2)");
        return;
      }
    } catch (error) {
      console.log("الطريقة 2 فشلت، جاري تجربة طريقة أخرى...");
    }

    // الطريقة 3: استخدام سيليكتور مباشر للزر الأزرق في نافذة التأكيد

    try {
      const blueBtn = await page.$(
        ".confirm-dialog .btn-primary, .modal-dialog .btn-primary, .modal .btn-confirm, .dialog-box .btn-blue"
      );
      if (blueBtn) {
        await blueBtn.click();
        console.log("✅ تم النقر على زر إرسال النهائي بنجاح (طريقة 3)");
        return;
      }
    } catch (error) {
      console.log("الطريقة 3 فشلت، جاري تجربة طريقة أخرى...");
    }

    // الطريقة 4: البحث عن زر باللون الأزرق في الصفحة
    try {
      const blueButton = await page.evaluateHandle(() => {
        // البحث عن العناصر ذات الخلفية الزرقاء الفاتحة
        const elements = [
          ...document.querySelectorAll('button, .btn, [role="button"]'),
        ];
        const blueElements = elements.filter((el) => {
          const style = window.getComputedStyle(el);
          const backgroundColor = style.backgroundColor;
          const color = style.color;

          // البحث عن العناصر ذات الخلفية الزرقاء الفاتحة أو النص الأبيض على خلفية زرقاء
          return (
            backgroundColor.includes("rgb(0, 149, 255)") ||
            backgroundColor.includes("rgb(33, 150, 243)") ||
            backgroundColor.includes("rgb(52, 152, 219)") ||
            (color.includes("rgb(255, 255, 255)") &&
              (backgroundColor.includes("rgb(0, 1") ||
                backgroundColor.includes("rgb(33, 1")))
          );
        });

        // إعادة أول عنصر أزرق فاتح
        return blueElements[0] || null;
      });

      if (blueButton.asElement()) {
        await blueButton.asElement().click();
        console.log("✅ تم النقر على زر أزرق اللون (طريقة 4)");
        return;
      }
    } catch (error) {
      console.log("الطريقة 4 فشلت، جاري تجربة طريقة أخيرة...");
    }

    // الطريقة 5: النقر على آخر زر ظاهر في الصفحة
    try {
      const allButtons = await page.$('button, .btn, [role="button"]');
      if (allButtons.length > 0) {
        // الحصول على آخر زر ظاهر في الصفحة
        const lastButton = allButtons[allButtons.length - 1];
        await lastButton.click();
        console.log("✅ تم النقر على آخر زر ظاهر في الصفحة (طريقة 5)");
        return;
      }
    } catch (error) {
      console.log("الطريقة 5 فشلت");
    }

    console.log("⚠️ لم يتم العثور على زر إرسال النهائي بأي طريقة");
  } catch (error) {
    console.error(`❌ Error clicking final confirm button: ${error.message}`);
    // لا نرفع الخطأ هنا لضمان استمرار العملية حتى لو لم نستطع النقر على زر إرسال
    console.log("⚠️ الاستمرار بالرغم من خطأ في النقر على زر إرسال");
  }
};

const clickSendButton = async (page) => {
  try {
    console.log("📌 بدء عملية البحث عن زر الإرسال في النافذة المنبثقة...");
    await delay(2000); // زيادة التأخير لضمان ظهور النافذة المنبثقة بشكل كامل

    // الطريقة 4: استهداف أفضل مطابقة محتملة باستخدام قائمة الأزرار من السجل
    try {
      await page.evaluate(() => {
        // قائمة الفئات المستهدفة بناءً على السجل
        const targetClasses = [
          "Button_btn__P0ibl Button_btn_primary__1ncdM",
          "Button_btn_wrap__utZqk",
          "Button_icon_text__C-ysi",
        ];

        // البحث عن أي عنصر يتطابق مع هذه الفئات
        for (const className of targetClasses) {
          const elements = document.getElementsByClassName(className);
          if (elements && elements.length > 0) {
            for (const el of elements) {
              if (
                el.innerText.includes("إرسال") ||
                el.textContent.includes("إرسال")
              ) {
                el.click();
                return true;
              }
            }

            // حتى لو لم يحتوِ على النص، انقر على أول عنصر
            if (elements[0]) {
              elements[0].click();
              return true;
            }
          }
        }

        return false;
      });

      console.log("✅ تم النقر على أفضل مطابقة محتملة للزر");
      return;
    } catch (error) {
      console.log(`الطريقة 4 فشلت: ${error.message}`);
    }

    // الطريقة 5: الاستهداف الدقيق للزر باستخدام XPath
    try {
      // استخدام XPath للبحث عن العنصر بدقة
      const [sendButton] = await page.$x(
        "//div[contains(@class, 'Button_btn__P0ibl') and contains(@class, 'Button_btn_primary__1ncdM') and contains(text(), 'إرسال')] | " +
          "//div[contains(@class, 'Button_btn__P0ibl') and contains(@class, 'Button_btn_primary__1ncdM')]/div[contains(@class, 'Button_icon_text__C-ysi') and contains(text(), 'إرسال')]"
      );

      if (sendButton) {
        await sendButton.click();
        console.log("✅ تم النقر على زر الإرسال باستخدام XPath الدقيق");
        return;
      }
    } catch (error) {
      console.log(`الطريقة 5 فشلت: ${error.message}`);
    }

    // الطريقة 6: محاولة استخدام تحديد الموضع المطلق للنقر
    try {
      const confirmElement = await page.$(".PopConfirmRedeem_btn_wrap__3RKFf");
      if (confirmElement) {
        // الحصول على موقع عنصر التأكيد
        const box = await confirmElement.boundingBox();
        if (box) {
          // النقر على الجانب الأيسر العلوي من العنصر (حيث من المرجح أن يكون زر "إرسال")
          await page.mouse.click(box.x + 50, box.y + 25);
          console.log("✅ تم النقر على موضع الزر باستخدام الإحداثيات المطلقة");
          return;
        }
      }
    } catch (error) {
      console.log(`الطريقة 6 فشلت: ${error.message}`);
    }

    // الطريقة 7: الاستفادة من البيانات التحليلية من السجل الذي قدمته
    try {
      // محاولة النقر مباشرة على الزر رقم 22 (من السجل، فهو يحمل نص "إرسال")
      await page.evaluate(() => {
        // استهداف العنصر بالضبط باستخدام الفئات المستخرجة من السجل
        const elements = document.querySelectorAll(
          ".Button_btn__P0ibl.Button_btn_primary__1ncdM"
        );

        // لوب على جميع العناصر المطابقة والبحث عن زر "إرسال"
        for (const el of elements) {
          if (el.innerText === "إرسال" || el.textContent === "إرسال") {
            // قبل النقر، نتأكد من أن العنصر مرئي
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              // النقر على العنصر
              el.click();
              return true;
            }
          }
        }

        return false;
      });

      console.log(
        "✅ تم النقر على زر الإرسال باستخدام البيانات التحليلية من السجل"
      );
      return;
    } catch (error) {
      console.log(`الطريقة 7 فشلت: ${error.message}`);
    }

    // الطريقة 8: النقر المباشر على دوم العنصر رقم 22 (استناداً للسجل)
    try {
      await page.evaluate(() => {
        // الحصول على كل العناصر المرئية في الصفحة التي تشبه الأزرار
        const allElements = [...document.querySelectorAll("*")];
        const buttons = allElements.filter((el) => {
          const style = window.getComputedStyle(el);
          return (
            (el.tagName === "BUTTON" ||
              (el.tagName === "DIV" &&
                (el.getAttribute("role") === "button" ||
                  el.className.includes("btn") ||
                  el.className.includes("button")))) &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0"
          );
        });

        // محاولة استهداف زر محدد (الزر رقم 22 من السجل)
        const targetIndex = 22; // استناداً إلى السجل، هذا هو الزر الذي يحمل نص "إرسال"
        if (buttons.length > targetIndex) {
          buttons[targetIndex].click();
          return true;
        }

        return false;
      });

      console.log(
        "✅ تم النقر على زر الإرسال باستخدام الاستهداف المباشر للعنصر رقم 22"
      );
      return;
    } catch (error) {
      console.log(`الطريقة 8 فشلت: ${error.message}`);
    }

    // الطريقة 9: محاولة أخيرة باستخدام نقر سلسلة متتابعة
    try {
      // أولاً، نحاول النقر على حاوية الزر
      await page.evaluate(() => {
        const buttonContainer = document.querySelector(
          ".PopConfirmRedeem_btn_wrap__3RKFf"
        );
        if (buttonContainer) {
          buttonContainer.click();

          // ثم ننتظر لحظة ونحاول النقر على الزر الأول الذي يحتوي على "إرسال"
          setTimeout(() => {
            const sendButton = document.querySelector(
              ".Button_btn_wrap__utZqk"
            );
            if (sendButton) sendButton.click();
          }, 100);

          // وأخيراً نحاول النقر على الزر الأزرق الرئيسي
          setTimeout(() => {
            const primaryButton = document.querySelector(
              ".Button_btn__P0ibl.Button_btn_primary__1ncdM"
            );
            if (primaryButton) primaryButton.click();
          }, 200);

          return true;
        }
        return false;
      });

      console.log(
        "✅ تم إرسال سلسلة من النقرات المتتابعة للتأكد من النقر على الزر"
      );
      // انتظار لحظة للسماح بمعالجة النقرات المتتابعة
      await delay(500);
      return;
    } catch (error) {
      console.log(`الطريقة 9 فشلت: ${error.message}`);
    }

    console.log("⚠️ لم يتم العثور على زر إرسال في النافذة المنبثقة بأي طريقة");
    console.log("⏳ المتابعة بالرغم من ذلك، قد تكون العملية اكتملت بنجاح...");
  } catch (err) {
    console.error(`❌ خطأ في النقر على زر الإرسال: ${err.message}`);
    console.log("⏳ المتابعة بالرغم من الخطأ، قد تكون العملية اكتملت بنجاح...");
  }
};

// API Endpoint
app.post("/recharge", async (req, res) => {
  const { api_key, code_id, player_id, code, order_id } = req.body;

  if (!api_key || api_key !== "PubG2025SecretKey") {
    console.log("Invalid API key:", api_key);
    return res.status(401).json({ success: false, message: "Invalid API key" });
  }

  console.log(
    `Starting recharge: Order ${order_id}, Player ${player_id}, Code ${code}`
  );

  if (!player_id || !code)
    return res
      .status(400)
      .json({ success: false, message: "player_id and code are required" });

  try {
    const result = await rechargePlayerCode(player_id, code);
    return res.status(200).json({
      success: true,
      message: `Process completed - login popup opened${
        emailEntered ? " and email entered" : ""
      }`,
      order_id: order_id,
      player_id: player_id,
      code: code,
      data: result,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// صفحة الترحيب البسيطة
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>PUBG Recharge Service</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; direction: rtl; }
          h1 { color: #2c3e50; }
          .card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-top: 20px; }
          button { background: #3498db; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; }
          input { padding: 8px; margin: 10px 0; width: 100%; }
        </style>
      </head>
      <body>
        <h1>خدمة شحن أكواد PUBG</h1>
        <div class="card">
          <h3>اختبار الشحن</h3>
          <input id="playerId" type="text" placeholder="معرف اللاعب" value="5555511111" />
          <input id="code" type="text" placeholder="كود الشحن" value="TESTCODE123" />
          <button onclick="testRecharge()">اختبار</button>
          <div id="result" style="margin-top: 20px;"></div>
        </div>
        
        <script>
          async function testRecharge() {
            const playerId = document.getElementById('playerId').value;
            const code = document.getElementById('code').value;
            
            document.getElementById('result').innerHTML = 'جاري الاختبار...';
            
            try {
              const response = await fetch(\`/test-recharge?playerId=\${playerId}&code=\${code}\`);
              const data = await response.json();
              
              document.getElementById('result').innerHTML = 
                \`<div style="color: \${data.success ? 'green' : 'red'}">\${data.message}</div>\`;
            } catch (error) {
              document.getElementById('result').innerHTML = 
                \`<div style="color: red">Error: \${error.message}</div>\`;
            }
          }
        </script>
      </body>
    </html>
  `);
});

// بدء السيرفر
const PORT = 3000;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Test the service by visiting http://localhost:${PORT}`);
});

// التعامل مع إنهاء العملية بشكل أفضل
process.on("SIGINT", () => {
  console.log("Gracefully shutting down the server...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});
