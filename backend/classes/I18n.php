<?php

class I18n
{
    private static $lang = 'zh-CN';
    private static $defaultLang = 'zh-CN';
    private static $fallbackLang = 'en-US';
    private static $supportedLangs = ['zh-CN', 'en-US', 'ja-JP'];
    private static $translations = [];
    private static $initialized = false;

    public static function init($config = [])
    {
        if (self::$initialized) {
            return;
        }

        if (isset($config['default_lang'])) {
            self::$defaultLang = $config['default_lang'];
            self::$lang = $config['default_lang'];
        }
        if (isset($config['fallback_lang'])) {
            self::$fallbackLang = $config['fallback_lang'];
        }
        if (isset($config['supported_langs'])) {
            self::$supportedLangs = $config['supported_langs'];
        }

        self::loadTranslations();
        self::$initialized = true;
    }

    private static function loadTranslations()
    {
        $langsDir = __DIR__ . '/../langs/';
        foreach (self::$supportedLangs as $lang) {
            $file = $langsDir . $lang . '.php';
            if (file_exists($file)) {
                self::$translations[$lang] = require $file;
            } else {
                self::$translations[$lang] = [];
            }
        }
    }

    public static function setLang($lang)
    {
        if (in_array($lang, self::$supportedLangs)) {
            self::$lang = $lang;
            return true;
        }
        return false;
    }

    public static function getLang()
    {
        return self::$lang;
    }

    public static function getSupportedLangs()
    {
        return self::$supportedLangs;
    }

    public static function t($key, $params = [])
    {
        $tryLangs = [];
        if (self::$lang !== self::$defaultLang && self::$lang !== self::$fallbackLang) {
            $tryLangs[] = self::$lang;
        }
        if (self::$lang !== self::$fallbackLang) {
            $tryLangs[] = self::$fallbackLang;
        }
        $tryLangs[] = self::$defaultLang;

        $value = null;
        foreach ($tryLangs as $lang) {
            $value = self::getByPath(self::$translations[$lang] ?? [], $key);
            if ($value !== null && is_string($value)) {
                break;
            }
        }

        if ($value === null) {
            $value = $key;
        }

        if (!empty($params)) {
            $value = self::formatTemplate($value, $params);
        }

        return $value;
    }

    private static function getByPath($array, $path)
    {
        if (empty($path)) {
            return null;
        }
        $parts = explode('.', $path);
        $curr = $array;
        foreach ($parts as $part) {
            if ($curr === null || !is_array($curr) || !isset($curr[$part])) {
                return null;
            }
            $curr = $curr[$part];
        }
        return $curr;
    }

    private static function formatTemplate($str, $params)
    {
        if (empty($params)) {
            return $str;
        }
        return preg_replace_callback('/\{(\w+)\}/', function ($matches) use ($params) {
            $key = $matches[1];
            return isset($params[$key]) ? $params[$key] : $matches[0];
        }, $str);
    }

    public static function getAllTranslations()
    {
        return self::$translations[self::$lang] ?? [];
    }
}
