# Dual Currency System - Local & Overseas Teachers

## 🌍 Overview

Umar Academy Portal now supports **two types of teachers** with **two different currencies**:

1. **Local Teachers (USA)** 🇺🇸 - Paid in **USD ($)**
2. **Overseas Teachers (Pakistan)** 🇵🇰 - Paid in **PKR (Rs)**

---

## 📋 How It Works

### **During Teacher Registration**

#### **Step 1: Personal Information Tab**

After filling basic details (name, email, phone, etc.), the Super Admin selects the **Teacher Location**:

```
┌─────────────────────────────────────────────────────┐
│  Teacher Location *                                 │
├─────────────────────┬──────────────────────────────┤
│  🇺🇸 Local (USA)    │  🇵🇰 Overseas Pakistan      │
│  Salary in USD ($)  │  Salary in PKR (Rs)         │
└─────────────────────┴──────────────────────────────┘

💡 Selected: Local • Currency: USD ($)
```

**Location Selection Features:**
- ✅ Visual flag indicators (🇺🇸 / 🇵🇰)
- ✅ Clear currency labels
- ✅ Large clickable cards
- ✅ Confirmation message showing selection

#### **Step 2: Payroll Tab**

The currency is **automatically set** based on location:

**For Local Teachers (USD):**
```
Hourly Rate ($) *
┌──────────────────┐
│ $ 25.00          │
└──────────────────┘

Monthly Salary (USD): $4,400
```

**For Overseas Teachers (PKR):**
```
Hourly Rate (Rs) *
┌──────────────────┐
│ Rs 5000          │
└──────────────────┘

Monthly Salary (PKR): Rs110,000
```

---

## 💰 Currency Details

### **USD (US Dollar) - Local Teachers**
- **Symbol:** $
- **Format:** $X,XXX.XX
- **Used for:** Teachers based in USA
- **Example Rate:** $25/hour
- **Example Salary:** $4,400/month

### **PKR (Pakistani Rupee) - Overseas Teachers**
- **Symbol:** Rs
- **Format:** RsX,XXX
- **Used for:** Teachers based in Pakistan
- **Example Rate:** Rs5,000/hour
- **Example Salary:** Rs110,000/month

---

## 🎯 Complete Workflow Example

### **Registering a Local Teacher (USA)**

1. **Tab 1 - Personal Info:**
   ```
   Full Name: John Smith
   Email: john@umaracademy.org
   Phone: +1-555-1234
   Emergency: +1-555-5678
   Department: Mathematics
   
   Location: 🇺🇸 Local (USA)
   ✅ Currency auto-set to USD
   ```

2. **Tab 3 - Payroll:**
   ```
   Hourly Rate: $30
   Daily Hours: 8
   Days Working: 22
   
   Auto-Calculated:
   Monthly Hours: 176 hrs
   Monthly Salary: $5,280
   ```

### **Registering an Overseas Teacher (Pakistan)**

1. **Tab 1 - Personal Info:**
   ```
   Full Name: Ahmad Hassan
   Email: ahmad@umaracademy.org
   Phone: +92-300-1234567
   Emergency: +92-300-7654321
   Department: Islamic Studies
   
   Location: 🇵🇰 Overseas Pakistan
   ✅ Currency auto-set to PKR
   ```

2. **Tab 3 - Payroll:**
   ```
   Hourly Rate: Rs6,000
   Daily Hours: 8
   Days Working: 22
   
   Auto-Calculated:
   Monthly Hours: 176 hrs
   Monthly Salary: Rs1,056,000
   ```

---

## 👨‍🏫 Teacher Profile Display

### **Local Teacher Profile:**

```
Personal Information
├─ Location: 🇺🇸 Local
└─ Currency: USD

Payroll Information (USD)
💵 Currency: USD ($) • Location: 🇺🇸 Local
├─ Hourly Rate: $30
├─ Monthly Hours: 176 hrs
└─ Monthly Salary: $5,280
```

### **Overseas Teacher Profile:**

```
Personal Information
├─ Location: 🇵🇰 Overseas Pakistan
└─ Currency: PKR

Payroll Information (PKR)
💵 Currency: PKR (Rs) • Location: 🇵🇰 Overseas Pakistan
├─ Hourly Rate: Rs6,000
├─ Monthly Hours: 176 hrs
└─ Monthly Salary: Rs1,056,000
```

---

## 🔄 Automatic Features

### **1. Currency Auto-Selection**
- ✅ Local → Automatically sets USD
- ✅ Overseas Pakistan → Automatically sets PKR
- ✅ Cannot be manually changed (tied to location)

### **2. Symbol Display**
- ✅ USD uses: $
- ✅ PKR uses: Rs
- ✅ Symbols appear in all payroll fields

### **3. Number Formatting**
- ✅ USD: $4,400.00 (with decimals)
- ✅ PKR: Rs110,000 (with thousands separator)

### **4. Visual Indicators**
- ✅ Flag emojis (🇺🇸 🇵🇰)
- ✅ Color coding (blue for USD, green for PKR)
- ✅ Currency labels on all payroll displays

---

## 📊 Comparison Table

| Feature | Local (USA) | Overseas (Pakistan) |
|---------|-------------|---------------------|
| Flag | 🇺🇸 | 🇵🇰 |
| Currency | USD | PKR |
| Symbol | $ | Rs |
| Example Rate | $25/hr | Rs5,000/hr |
| Example Salary | $4,400/month | Rs110,000/month |
| Format | $X,XXX.XX | RsX,XXX |
| Location Type | Local | Overseas Pakistan |

---

## 🎨 UI Features

### **Registration Form:**
- ✅ **Location Selection Cards**
  - Large, clickable cards
  - Flag emoji for visual identification
  - Currency information displayed
  - Selected state highlighting

- ✅ **Confirmation Display**
  - Shows selected location
  - Shows active currency
  - Shows currency symbol

- ✅ **Payroll Tab**
  - Currency symbol in input field
  - Placeholder shows example amount
  - Real-time currency-aware calculations
  - Special badge for PKR (Pakistani Rupee note)

### **Teacher Profile:**
- ✅ **Location Badge**
  - Flag + location name
  - Displayed in personal info section

- ✅ **Currency Banner**
  - Shows currency and symbol
  - Location context included
  - Color-coded by currency type

- ✅ **Salary Display**
  - Large, prominent amount
  - Currency-specific formatting
  - Formula breakdown with symbols

---

## 💡 Best Practices

### **For Super Admin:**

1. **Verify Location Before Registration**
   - Confirm teacher's actual location
   - Choose correct location type
   - Currency will auto-set correctly

2. **Salary Benchmarking**
   - USD: Typical US hourly rates ($20-$50/hr)
   - PKR: Typical Pakistani rates (Rs3,000-Rs8,000/hr)

3. **Record Keeping**
   - Each teacher profile shows location
   - Currency is always displayed
   - Easy to filter by location/currency

### **For Teachers:**

1. **Profile Review**
   - Check location is correct
   - Verify currency matches location
   - Review salary calculations

2. **Understanding Payroll**
   - Monthly salary shown in your currency
   - Hourly rate clearly displayed
   - All calculations automatic

---

## 🔐 Data Structure

### **Teacher Object with Currency:**

```typescript
{
  id: "TCH1234567890",
  fullName: "Ahmad Hassan",
  location: "Overseas Pakistan",  // or "Local"
  payroll: {
    hourlyRate: 6000,
    currency: "PKR",  // or "USD"
    dailyHours: 8,
    daysWorking: 22,
    monthlyHours: 176,  // auto-calculated
    monthlySalary: 1056000  // auto-calculated
  }
}
```

---

## 📈 Future Enhancements

Potential future features:
- 📊 Exchange rate tracking
- 💱 Currency conversion displays
- 📉 Salary comparison reports
- 🌍 Additional countries/currencies
- 📧 Payment processing integration

---

## ✅ Summary

✅ Two teacher types supported: Local & Overseas Pakistan  
✅ Two currencies: USD ($) & PKR (Rs)  
✅ Automatic currency selection based on location  
✅ Visual indicators (flags, colors, symbols)  
✅ Currency-aware formatting throughout  
✅ Complete payroll tracking in respective currency  
✅ Teacher profile shows location and currency  
✅ All calculations automatic and currency-specific  

---

**Built for Umar Academy Portal** 🎓
Supporting teachers worldwide with proper currency management!
