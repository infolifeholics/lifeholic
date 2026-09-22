import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1couKMsGuunmNDY89HJfCXgRljxytHOqMgqDF0rGYh8k';
const USERS_SHEET = process.env.GOOGLE_SHEETS_USERS_SHEET || 'Users';
const ORDERS_SHEET = process.env.GOOGLE_SHEETS_ORDERS_SHEET || 'Orders';
const CART_SHEET = process.env.GOOGLE_SHEETS_CART_SHEET || 'Cart';

function getGoogleSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    return null;
  }

  // Handle escaped newlines in private key
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

function formatDate(dateInput?: string | Date | number | null): { dateStr: string; timeStr: string; fullFormatted: string } {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    return formatDate(now);
  }

  // Format DD/MM/YYYY HH:mm:ss in IST (Asia/Kolkata) timezone
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };

  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(d);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';

  const day = getPart('day');
  const month = getPart('month');
  const year = getPart('year');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const second = getPart('second');

  const dateStr = `${day}/${month}/${year}`;
  const timeStr = `${hour}:${minute}:${second}`;
  const fullFormatted = `${dateStr} ${timeStr}`;

  return { dateStr, timeStr, fullFormatted };
}

// Check and initialize headers for the sheets if empty
let initializedSheets = false;
async function ensureHeaders(sheets: any) {
  if (initializedSheets) return;
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetTitles = (meta.data.sheets || []).map((s: any) => s.properties?.title);

    // If first 3 sheet names differ, we work with tab index or sheet names
    const targetSheets = [
      { name: sheetTitles[0] || USERS_SHEET, headers: ['User ID', 'Name', 'Email', 'Phone', 'Country', 'Currency', 'Profile Data', 'Created At', 'Updated At', 'Location', 'Last Activity'] },
      { name: sheetTitles[1] || ORDERS_SHEET, headers: ['Order ID', 'User ID', 'Customer Name', 'Email', 'Phone', 'Product(s)', 'Quantity', 'Subtotal', 'Shipping', 'Total', 'Currency', 'Payment Status', 'Order Status', 'Razorpay Payment ID', 'Created At', 'Updated At', 'Location'] },
      { name: sheetTitles[2] || CART_SHEET, headers: ['User ID', 'Customer Name', 'Email', 'Product ID', 'Product Name', 'Quantity', 'Unit Price', 'Currency', 'Cart Total', 'Added At', 'Updated At', 'Location'] },
    ];

    for (const sheetDef of targetSheets) {
      if (!sheetDef.name) continue;
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetDef.name}'!A1:Z1`,
      });

      if (!res.data.values || res.data.values.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${sheetDef.name}'!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [sheetDef.headers] },
        });
      }
    }
    initializedSheets = true;
  } catch (err) {
    console.error('[GoogleSheets] Error ensuring headers:', err);
  }
}

/**
 * Sync User Profile to Sheet 1
 */
export async function syncUserToGoogleSheet(userData: {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  currency?: string | null;
  city?: string | null;
  address?: string | null;
  bio?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}) {
  try {
    const sheets = getGoogleSheetsClient();
    if (!sheets) return;
    await ensureHeaders(sheets);

    const sheetName = USERS_SHEET;
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A:K`,
    });

    const rows = readRes.data.values || [];
    const { fullFormatted: nowFormatted } = formatDate(userData.updated_at || new Date());
    const { fullFormatted: createdFormatted } = formatDate(userData.created_at || new Date());

    const profileSummary = [userData.city, userData.address, userData.bio].filter(Boolean).join(' | ') || 'N/A';
    const location = [userData.city, userData.country].filter(Boolean).join(', ') || userData.country || 'N/A';

    const rowValues = [
      userData.id,
      userData.full_name || 'N/A',
      userData.email || 'N/A',
      userData.phone || 'N/A',
      userData.country || 'N/A',
      userData.currency || 'INR',
      profileSummary,
      createdFormatted,
      nowFormatted,
      location,
      nowFormatted,
    ];

    let existingRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === userData.id) {
        existingRowIndex = i + 1; // 1-indexed row number
        break;
      }
    }

    if (existingRowIndex > 0) {
      // Preserve existing Created At if present in existing row
      const existingCreatedAt = rows[existingRowIndex - 1][7] || createdFormatted;
      rowValues[7] = existingCreatedAt;

      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A${existingRowIndex}:K${existingRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValues] },
      });
    } else {
      // Insert new user at top (Row 2) to maintain newest at top
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              insertRange: {
                range: {
                  sheetId: 0, // Sheet 1
                  startRowIndex: 1,
                  endRowIndex: 2,
                },
                shiftDimension: 'ROWS',
              },
            },
          ],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A2:K2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValues] },
      });
    }
  } catch (err) {
    console.error('[GoogleSheets] Failed to sync user to Google Sheets:', err);
  }
}

/**
 * Sync Order to Sheet 2 (Newest Order ALWAYS at Row 2)
 */
export async function syncOrderToGoogleSheet(orderData: {
  id?: string;
  number?: string;
  user_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  items?: Array<{ name: string; quantity: number; price?: number }>;
  subtotal?: number;
  shipping?: number;
  total?: number;
  currency?: string;
  payment_status?: string;
  status?: string;
  order_status?: string;
  payment_ref?: string;
  created_at?: string;
  updated_at?: string;
  address?: any;
}) {
  try {
    const sheets = getGoogleSheetsClient();
    if (!sheets) return;
    await ensureHeaders(sheets);

    const sheetName = ORDERS_SHEET;
    const orderId = orderData.id || orderData.number || `ORD-${Date.now()}`;

    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A:Q`,
    });

    const rows = readRes.data.values || [];
    const { fullFormatted: createdFormatted } = formatDate(orderData.created_at || new Date());
    const { fullFormatted: updatedFormatted } = formatDate(orderData.updated_at || new Date());

    const productsSummary = (orderData.items || [])
      .map((item) => `${item.name} (x${item.quantity})`)
      .join(', ') || 'N/A';

    const totalQty = (orderData.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0);

    let location = 'N/A';
    if (orderData.address) {
      if (typeof orderData.address === 'string') {
        location = orderData.address;
      } else {
        location = [orderData.address.city, orderData.address.state, orderData.address.country]
          .filter(Boolean)
          .join(', ') || orderData.address.country || 'N/A';
      }
    }

    const rowValues = [
      orderId,
      orderData.user_id || 'Guest',
      orderData.full_name || 'N/A',
      orderData.email || 'N/A',
      orderData.phone || 'N/A',
      productsSummary,
      totalQty,
      orderData.subtotal ?? 0,
      orderData.shipping ?? 0,
      orderData.total ?? 0,
      orderData.currency || 'INR',
      orderData.payment_status || 'unpaid',
      orderData.order_status || orderData.status || 'pending',
      orderData.payment_ref || 'N/A',
      createdFormatted,
      updatedFormatted,
      location,
    ];

    let existingRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === orderId) {
        existingRowIndex = i + 1;
        break;
      }
    }

    if (existingRowIndex > 0) {
      // Preserve Created At if present
      const existingCreatedAt = rows[existingRowIndex - 1][14] || createdFormatted;
      rowValues[14] = existingCreatedAt;

      // Update existing order row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A${existingRowIndex}:Q${existingRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValues] },
      });
    } else {
      // Retrieve Sheet ID for Orders tab (second sheet, index 1 usually)
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const orderSheetObj = (meta.data.sheets || [])[1] || (meta.data.sheets || [])[0];
      const targetSheetId = orderSheetObj?.properties?.sheetId ?? 0;

      // Insert new order row at Row 2 (top of list below headers)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              insertRange: {
                range: {
                  sheetId: targetSheetId,
                  startRowIndex: 1,
                  endRowIndex: 2,
                },
                shiftDimension: 'ROWS',
              },
            },
          ],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A2:Q2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValues] },
      });
    }
  } catch (err) {
    console.error('[GoogleSheets] Failed to sync order to Google Sheets:', err);
  }
}

/**
 * Sync Cart Item to Sheet 3
 */
export async function syncCartItemToGoogleSheet(cartData: {
  userId: string;
  customerName?: string | null;
  email?: string | null;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  currency?: string;
  location?: string | null;
}) {
  try {
    const sheets = getGoogleSheetsClient();
    if (!sheets) return;
    await ensureHeaders(sheets);

    const sheetName = CART_SHEET;
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A:L`,
    });

    const rows = readRes.data.values || [];
    const { fullFormatted: nowFormatted } = formatDate(new Date());
    const cartTotal = cartData.quantity * cartData.unitPrice;

    const rowValues = [
      cartData.userId,
      cartData.customerName || 'N/A',
      cartData.email || 'N/A',
      cartData.productId,
      cartData.productName,
      cartData.quantity,
      cartData.unitPrice,
      cartData.currency || 'INR',
      cartTotal,
      nowFormatted,
      nowFormatted,
      cartData.location || 'N/A',
    ];

    let existingRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      // Unique combination: User ID + Product ID
      if (rows[i][0] === cartData.userId && rows[i][3] === cartData.productId) {
        existingRowIndex = i + 1;
        break;
      }
    }

    if (existingRowIndex > 0) {
      // Preserve Added At
      const existingAddedAt = rows[existingRowIndex - 1][9] || nowFormatted;
      rowValues[9] = existingAddedAt;

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A${existingRowIndex}:L${existingRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValues] },
      });
    } else {
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const cartSheetObj = (meta.data.sheets || [])[2] || (meta.data.sheets || [])[0];
      const targetSheetId = cartSheetObj?.properties?.sheetId ?? 0;

      // Insert at Row 2 (top)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              insertRange: {
                range: {
                  sheetId: targetSheetId,
                  startRowIndex: 1,
                  endRowIndex: 2,
                },
                shiftDimension: 'ROWS',
              },
            },
          ],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A2:L2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValues] },
      });
    }
  } catch (err) {
    console.error('[GoogleSheets] Failed to sync cart item to Google Sheets:', err);
  }
}

/**
 * Remove Cart Item from Sheet 3
 */
export async function removeCartItemFromGoogleSheet(userId: string, productId: string) {
  try {
    const sheets = getGoogleSheetsClient();
    if (!sheets) return;
    await ensureHeaders(sheets);

    const sheetName = CART_SHEET;
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A:L`,
    });

    const rows = readRes.data.values || [];
    let existingRowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === userId && rows[i][3] === productId) {
        existingRowIndex = i; // 0-indexed row
        break;
      }
    }

    if (existingRowIndex > 0) {
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const cartSheetObj = (meta.data.sheets || [])[2] || (meta.data.sheets || [])[0];
      const targetSheetId = cartSheetObj?.properties?.sheetId ?? 0;

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: targetSheetId,
                  dimension: 'ROWS',
                  startIndex: existingRowIndex,
                  endIndex: existingRowIndex + 1,
                },
              },
            },
          ],
        },
      });
    }
  } catch (err) {
    console.error('[GoogleSheets] Failed to remove cart item from Google Sheets:', err);
  }
}
