-- Food cards use category icons. Clear only references to removed bundled photos;
-- preserve nutrition values/sources and any independently supplied image URLs.
UPDATE `foods`
SET `image_url` = NULL,
    `image_source_url` = NULL,
    `image_credit` = NULL,
    `image_license` = NULL,
    `image_license_url` = NULL
WHERE `image_url` LIKE '/media/foods/%';
