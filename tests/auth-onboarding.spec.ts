import { test, expect } from '@playwright/test';

test.describe('Authentication and Onboarding Flow', () => {
  // Setup mocking for Server Actions if MOCK_TESTS is enabled
  test.beforeEach(async ({ page }) => {
    if (process.env.MOCK_TESTS === 'true') {
      await page.route('**/*', async (route) => {
        const request = route.request();
        const headers = request.headers();
        
        // Intercept Next.js Server Action POST requests
        if (request.method() === 'POST' && headers['next-action']) {
          const actionId = headers['next-action'];
          console.log(`[MOCK] Intercepted Server Action: ${actionId}`);

          // Determine what mock response to send back based on post data or actionId
          const postData = request.postData() || '';
          
          let responseBody = '0:{"success":true}\n'; // Default success response
          
          if (postData.includes('new.operator@example.com')) {
            // Sign up action response (requireVerification: false for easy flow)
            responseBody = '0:{"success":true,"requireVerification":false}\n';
          } else if (postData.includes('company_profile') || postData.includes('createCompanyAction')) {
            // Create company action response
            responseBody = '0:{"success":true,"data":{"cuit":"20304050607","razon_social":"Distribuidora Repuestos Sur S.R.L.","direccion":"Av. Hipólito Yrigoyen 4500","punto_venta":1,"afip_mode":"edge_simulation"}}\n';
          } else if (postData.includes('fetchCompaniesAction')) {
            // Fetch companies action response
            responseBody = '0:{"success":true,"data":[]}\n';
          }

          await route.fulfill({
            status: 200,
            contentType: 'text/x-component',
            body: responseBody,
          });
        } else {
          await route.continue();
        }
      });
    }
  });

  // Scenario 1: Fresh Onboarding (Wizard Flow)
  test('should complete registration and onboarding wizard flow', async ({ page }) => {
    const uniqueEmail = `test.operator.${Date.now()}.${Math.floor(Math.random() * 1000)}@example.com`;
    const testPassword = 'Password123!';
    const testName = 'Operador E2E';

    // 1. Go to sign-up
    await page.goto('/auth/sign-up');
    await expect(page).toHaveURL(/\/auth\/sign-up/);

    // 2. Fill registration details
    await page.locator('input#name').fill(testName);
    await page.locator('input#email').fill(uniqueEmail);
    await page.locator('input#password').fill(testPassword);
    
    // 3. Submit Form
    await page.locator('button[type="submit"]').click();

    // 4. Handle OTP Email Verification if prompted
    const otpLabel = page.locator('label[for="otp"]');
    if (await otpLabel.isVisible({ timeout: 4000 }).catch(() => false)) {
      await page.locator('input#otp').fill('123456');
      await page.locator('button:has-text("Verificar Código")').click();
    }

    // 5. Land on /protected/onboarding (Fresh flow / wizard mode)
    await page.waitForURL(/\/protected\/onboarding/, { timeout: 15000 });
    // Force the wizard view via query param for E2E testing consistency since other companies exist
    await page.goto('/protected/onboarding?wizard=true');
    await expect(page.locator('h1')).toContainText('Nodo Sur');

    // 6. Step 1: Select "1 CUIT" quantity and continue
    const oneCuitButton = page.locator('button:has-text("1 CUIT")');
    await oneCuitButton.click();
    await page.locator('button:has-text("Configurar Datos")').click();

    // 7. Step 2: Fill in the company information
    const dynamicCuit = `30${Math.floor(10000000 + Math.random() * 90000000)}9`;
    await page.locator('input[placeholder="CUIT de 11 dígitos sin guiones"]').fill(dynamicCuit);
    await page.locator('input[placeholder="Ej. Distribuidora Sur S.R.L."]').fill('Repuestos E2E S.R.L.');
    await page.locator('input[placeholder="Dirección fiscal completa"]').fill('Av. Galicia 1200, Avellaneda');
    await page.locator('input[placeholder="Celular de contacto (sin guiones)"]').fill('1134567890');
    await page.locator('input[placeholder="correo@empresa.com"]').fill('administracion@repuestose2e.com');
    await page.locator('input[placeholder="Ej. Repuestos Nodo Sur"]').fill('Repuestos E2E');

    // 8. Submit Step 2 form to final loader
    await page.locator('button:has-text("Finalizar e Ingresar")').click();

    // 9. Validate loader page is displayed and eventually redirects to protected space
    await expect(page.locator('text=Configurando entorno operativo...')).toBeVisible();
    await page.waitForURL(/\/protected/, { timeout: 25000 });
    await expect(page).toHaveURL(/\/protected/);
  });

  // Scenario 2: Existing Operator Login & Selection
  test('should login as an existing user and select a company profile', async ({ page }) => {
    // 1. Visit login
    await page.goto('/auth/sign-in');
    await expect(page).toHaveURL(/\/auth\/sign-in/);

    // 2. Fill login credentials (using operator registered in standard seed)
    await page.locator('input#email').fill('juan.pucciom@gmail.com');
    await page.locator('input#password').fill('Password123!');
    await page.locator('button[type="submit"]').click();

    // 3. User should land on onboarding selector screen
    await page.waitForURL(/\/protected\/onboarding/, { timeout: 15000 });
    await expect(page.locator('text=Empresas Disponibles')).toBeVisible();

    // 4. Click the company profile card to log in
    const companyCard = page.locator('button:has-text("Distribuidora Sur")');
    if (await companyCard.isVisible()) {
      await companyCard.click();
    } else {
      // Fallback: click first button/card available in grid
      await page.locator('button:has-text("Ingresar con este CUIT")').first().click();
    }

    // 5. Verify redirection to protected app layout
    await page.waitForURL(/\/protected/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/protected/);
  });

  // Scenario 3: Standard Selector Flow with Custom Company Creation
  test('should login and register a new company profile via standard selector', async ({ page }) => {
    // 1. Login existing operator
    await page.goto('/auth/sign-in');
    await page.locator('input#email').fill('juan.pucciom@gmail.com');
    await page.locator('input#password').fill('Password123!');
    await page.locator('button[type="submit"]').click();

    // 2. Wait for company list selector
    await page.waitForURL(/\/protected\/onboarding/, { timeout: 15000 });
    await expect(page.locator('text=Empresas Disponibles')).toBeVisible();

    // 3. Open standard creation form
    await page.locator('button:has-text("Agregar Empresa")').click();

    // 4. Complete standard company profile details
    const standardCuit = `30${Math.floor(10000000 + Math.random() * 90000000)}3`;
    await page.locator('input[placeholder="Solo números (11 dígitos)"]').fill(standardCuit);
    await page.locator('input[name="razon_social"]').fill('Autopartes Avellaneda S.A.');
    await page.locator('input[name="direccion"]').fill('Mitre 850, Avellaneda');
    await page.locator('select[name="condicion_iva"]').selectOption('Responsable Inscripto');
    await page.locator('input[name="celular"]').fill('1145456565');
    await page.locator('input[name="email"]').fill('info@autopartesavellaneda.com');
    await page.locator('input[name="nombre_fantasia"]').fill('Avellaneda Autopartes');

    // 5. Submit Form
    await page.locator('button[type="submit"]:has-text("Guardar e Ingresar")').click();

    // 6. Verify redirect to dashboard
    await page.waitForURL(/\/protected/, { timeout: 20000 });
    await expect(page).toHaveURL(/\/protected/);
  });
});
