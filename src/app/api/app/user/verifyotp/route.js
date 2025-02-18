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

    const otpRecord = await prisma.otps.findFirst({
      where: { user_id: parseInt(mobile), code: otp, type: 'user' },
      orderBy: { created_at: "desc" },
    });

    if (!otpRecord || new Date() > new Date(otpRecord.expires_at)) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    // Find or create the user
    let user = await prisma.users.findUnique({
      where: { mobile: mobile },
    });

    if (!user) {
      user = await prisma.users.create({
        data: { mobile },
      });
    }

    // Generate JWT Token
    const token = jwt.sign({ id: user.id, mobile: user.mobile }, JWT_SECRET);

    // Remove OTP after successful verification
    await prisma.otps.deleteMany({ where: { user_id: parseInt(mobile) } });

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
      token,
      user,
    });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    return NextResponse.json({ error: "Error verifying OTP" }, { status: 500 });
  }
}
