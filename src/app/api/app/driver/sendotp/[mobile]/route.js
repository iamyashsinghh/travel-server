import { NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "@/lib/prisma";

const API_KEY = process.env.FAST2SMS_API_KEY;

export async function GET(req, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { mobile } = resolvedParams;

    if (!mobile || mobile.length !== 10) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const driver = prisma.drivers.findUnique({where:{mobile}})

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    // const otp = Math.floor(100000 + Math.random() * 900000);
    const otp = 999999;
    
    await prisma.otps.create({
      data: {
        user_id: mobile,
        code: otp.toString(),
        type: 'driver',
        expires_at: expiresAt,
      },
    });
    // Fast2SMS API Request
    // const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
    //   params: {
    //     authorization: API_KEY,
    //     variables_values: otp,
    //     route: "otp",
    //     numbers: mobile, // Fast2SMS accepts numbers without +91 (you can add it if required)
    //   },
    //   headers: { "Content-Type": "application/json" },
    // });

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      response: true,
    });
  } catch (error) {
    console.error("OTP Error:", error.response?.data || error.message);
    return NextResponse.json({ error: "Error sending OTP", details: error.response?.data }, { status: 500 });
  }
}
