// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

afterEach(() => {
  cleanup();
});

describe('Masukan OTP', () => {
  it('merender wadah otp', () => {
    const { container } = render(
      <InputOTP maxLength={4}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
      </InputOTP>,
    );
    expect(container.querySelector('[data-slot="input-otp"]')).not.toBe(null);
  });

  it('merender dua slot', () => {
    const { container } = render(
      <InputOTP maxLength={4}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
        </InputOTPGroup>
      </InputOTP>,
    );
    expect(
      container.querySelectorAll('[data-slot="input-otp-slot"]').length,
    ).toBe(2);
  });
});
