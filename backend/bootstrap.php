<?php

require_once __DIR__ . '/config/common.php';
require_once __DIR__ . '/classes/I18n.php';
require_once __DIR__ . '/classes/Currency.php';

$config = [
    'base_currency' => 'CNY',
    'default_lang' => 'zh-CN',
    'fallback_lang' => 'en-US',
    'supported_langs' => ['zh-CN', 'en-US', 'ja-JP'],
    'supported_currencies' => ['CNY', 'USD', 'JPY', 'EUR', 'HKD'],
];

I18n::init($config);
Currency::init($config);
