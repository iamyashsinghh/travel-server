import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    const { mobile, otp } = await req.json();
    if (!mobile || !otp) {
      return NextResponse.json({ error: "Mobile and OTP are required" }, { status: 400 });
    }

    // Check if OTP exists and is valid
    const otpRecord = await prisma.otps.findFirst({
      where: { user_id: mobile, code: otp, type: "driver" },
      orderBy: { created_at: "desc" },
    });

    if (!otpRecord || new Date() > new Date(otpRecord.expires_at)) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    let driver = await prisma.drivers.findUnique({
      where: { mobile: mobile.toString().trim() },
    });

    if (!driver) {
      return NextResponse.json({ error: "Failed to create or fetch driver" }, { status: 500 });
    }

    if (!JWT_SECRET) {
      return NextResponse.json({ error: "Server configuration error: Missing JWT_SECRET" }, { status: 500 });
    }

    const token = jwt.sign({ id: driver.id, mobile: driver.mobile }, JWT_SECRET, { expiresIn: "7d" });

    await prisma.otps.deleteMany({ where: { user_id: mobile } });

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
      token,
      driver,
    });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    return NextResponse.json({ error: "Error verifying OTP" }, { status: 500 });
  }
}
