import { NextResponse } from "next/server";

export const jsonOk = <T>(data: T, init: ResponseInit = {}) =>
  NextResponse.json(data, {
    ...init,
    status: 200,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });

export const jsonErr = (message: string, status = 400) =>
  NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "content-type": "application/json",
      },
    },
  );
