<?php

class Currency
{
    private static $currency = 'CNY';
    private static $baseCurrency = 'CNY';
    private static $supportedCurrencies = ['CNY', 'USD', 'JPY', 'EUR', 'HKD'];
    private static $rates = [];
    private static $customRates = [];
    private static $initialized = false;

    const FALLBACK_RATES = [
        'CNY' => 1.0,
        'USD' => 0.14,
        'JPY' => 21.0,
        'EUR' => 0.13,
        'HKD' => 1.09,
    ];

    const SYMBOLS = [
        'CNY' => '¥',
        'USD' => '$',
        'JPY' => '¥',
        'EUR' => '€',
        'HKD' => 'HK$',
    ];

    const DECIMALS = [
        'CNY' => 2,
        'USD' => 2,
        'JPY' => 0,
        'EUR' => 2,
        'HKD' => 2,
    ];

    public static function init($config = [])
    {
        if (self::$initialized) {
            return;
        }

        if (isset($config['base_currency'])) {
            self::$baseCurrency = $config['base_currency'];
            self::$currency = $config['base_currency'];
        }
        if (isset($config['supported_currencies'])) {
            self::$supportedCurrencies = $config['supported_currencies'];
        }

        self::$rates = self::FALLBACK_RATES;
        self::$initialized = true;
    }

    public static function setCurrency($currency)
    {
        if (in_array($currency, self::$supportedCurrencies)) {
            self::$currency = $currency;
            return true;
        }
        return false;
    }

    public static function getCurrency()
    {
        return self::$currency;
    }

    public static function getBaseCurrency()
    {
        return self::$baseCurrency;
    }

    public static function getSupportedCurrencies()
    {
        return self::$supportedCurrencies;
    }

    public static function getRates()
    {
        $result = [];
        foreach (self::$supportedCurrencies as $c) {
            $result[$c] = self::getRate($c);
        }
        return $result;
    }

    public static function getRate($currency)
    {
        if (isset(self::$customRates[$currency])) {
            return self::$customRates[$currency];
        }
        return self::$rates[$currency] ?? 1.0;
    }

    public static function getSymbol($currency = null)
    {
        $c = $currency ?? self::$currency;
        return self::SYMBOLS[$c] ?? $c . ' ';
    }

    public static function getDecimals($currency = null)
    {
        $c = $currency ?? self::$currency;
        return self::DECIMALS[$c] ?? 2;
    }

    public static function convert($amount, $from = null, $to = null)
    {
        $fromCurrency = $from ?? self::$baseCurrency;
        $toCurrency = $to ?? self::$currency;

        if (!in_array($fromCurrency, self::$supportedCurrencies) || !in_array($toCurrency, self::$supportedCurrencies)) {
            return null;
        }

        $fromRate = self::getRate($fromCurrency);
        $toRate = self::getRate($toCurrency);

        $baseAmount = $fromCurrency === self::$baseCurrency ? $amount : $amount / $fromRate;
        $result = $toCurrency === self::$baseCurrency ? $baseAmount : $baseAmount * $toRate;

        return $result;
    }

    public static function format($amount, $to = null)
    {
        $toCurrency = $to ?? self::$currency;
        $decimals = self::getDecimals($toCurrency);
        $symbol = self::getSymbol($toCurrency);

        $converted = $amount;
        if ($toCurrency !== self::$baseCurrency) {
            $converted = self::convert($amount, self::$baseCurrency, $toCurrency);
        }

        $formatted = $symbol . self::formatNumber($converted, $decimals);
        return $formatted;
    }

    private static function formatNumber($num, $decimals)
    {
        $fixed = number_format($num, $decimals, '.', ',');
        return $fixed;
    }

    public static function refreshRates()
    {
        $url = 'https://api.exchangerate-api.com/v4/latest/CNY';
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $response) {
            $data = json_decode($response, true);
            if (isset($data['rates'])) {
                foreach (self::$supportedCurrencies as $c) {
                    if (isset($data['rates'][$c])) {
                        self::$customRates[$c] = (float)$data['rates'][$c];
                    }
                }
                return true;
            }
        }

        self::$customRates = [];
        return false;
    }
}
