include $(TOPDIR)/rules.mk

PKG_NAME:=engsel
PKG_VERSION:=1.0.0
PKG_RELEASE:=3
PKG_LICENSE:=MIT
PKG_MAINTAINER:=engsel users

PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)-$(PKG_VERSION)

include $(INCLUDE_DIR)/package.mk

define Package/engsel
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=Native MyXL CLI backend for OpenWrt
  URL:=https://github.com/greencabe/luci-app-engsel
  DEPENDS:=+libmbedtls +ca-bundle +curl
endef

define Package/engsel/description
 Native OpenWrt backend for MyXL account, quota, store, checkout, and session handling.
endef

define Build/Prepare
	$(RM) -r $(PKG_BUILD_DIR)
	mkdir -p $(PKG_BUILD_DIR)
	$(CP) $(CURDIR)/src $(PKG_BUILD_DIR)/
endef

define Build/Compile
	$(TARGET_CC) $(TARGET_CFLAGS) $(TARGET_CPPFLAGS) -std=c99 -Wall -Wextra -Wno-unused-parameter -ffunction-sections -fdata-sections \
		$(TARGET_LDFLAGS) -Wl,--gc-sections \
		-o $(PKG_BUILD_DIR)/engsel $(PKG_BUILD_DIR)/src/engsel.c -lmbedcrypto
endef

define Package/engsel/install
	$(INSTALL_DIR) $(1)/usr/bin $(1)/usr/libexec/engsel
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/engsel $(1)/usr/libexec/engsel/engsel
	$(INSTALL_BIN) $(CURDIR)/files/engsel.wrapper $(1)/usr/bin/engsel
	$(INSTALL_DIR) $(1)/etc $(1)/etc/config $(1)/etc/engsel
	$(INSTALL_CONF) $(CURDIR)/files/engsel.env.example $(1)/etc/engsel/env.example
	$(INSTALL_CONF) $(CURDIR)/files/engsel.env.example $(1)/etc/engsel.env.example
	$(INSTALL_CONF) $(CURDIR)/files/engsel.env $(1)/etc/engsel/.env
	$(INSTALL_CONF) $(CURDIR)/files/engsel.env $(1)/etc/engsel.env
	$(INSTALL_CONF) $(CURDIR)/files/engsel.config $(1)/etc/config/engsel
endef

define Package/engsel/conffiles
/etc/config/engsel
/etc/engsel/.env
/etc/engsel.env
endef

define Package/engsel/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
mkdir -p /etc/engsel || exit 1
if [ ! -f /etc/engsel/.env ]; then
	if [ -f /etc/engsel.env ]; then
		cp /etc/engsel.env /etc/engsel/.env || exit 1
	fi
fi
if command -v uci >/dev/null 2>&1; then
	uci -q get engsel.config >/dev/null || uci set engsel.config=engsel || exit 1
	for key in BASE_API_URL BASE_CIAM_URL BASIC_AUTH AX_FP_KEY UA API_KEY ENCRYPTED_FIELD_KEY XDATA_KEY AX_API_SIG_KEY X_API_BASE_SECRET DECOY_PREPAID_OPTION_CODE DECOY_PRIORITAS_OPTION_CODE DECOY_PRIOHYBRID_OPTION_CODE DECOY_BALANCE_OPTION_CODE; do
		[ -n "$$(uci -q get engsel.config.$${key})" ] && continue
		value="$$(sed -n "s/^$${key}=//p" /etc/engsel.env /etc/engsel/.env 2>/dev/null | tail -n1)"
		if [ -n "$${value}" ]; then
			uci set engsel.config.$${key}="$${value}" || exit 1
		fi
	done
	uci commit engsel || exit 1
	umask 077
	tmp=/etc/engsel/.env.$$$$
	stamp_tmp=/etc/engsel/.uci.sha256.$$$$
	cleanup() {
		rm -f "$${tmp}" "$${stamp_tmp}"
	}
	trap cleanup 0
	trap 'cleanup; exit 1' 1 2 3 15
	if ! {
		for key in BASE_API_URL BASE_CIAM_URL BASIC_AUTH AX_FP_KEY UA API_KEY ENCRYPTED_FIELD_KEY XDATA_KEY AX_API_SIG_KEY X_API_BASE_SECRET DECOY_PREPAID_OPTION_CODE DECOY_PRIORITAS_OPTION_CODE DECOY_PRIOHYBRID_OPTION_CODE DECOY_BALANCE_OPTION_CODE; do
			value="$$(uci -q get engsel.config.$${key} 2>/dev/null)" || value=
			[ -n "$${value}" ] || continue
			printf '%s=%s\n' "$${key}" "$${value}" || exit 1
		done
	} > "$${tmp}"; then
		exit 1
	fi
	mv "$${tmp}" /etc/engsel/.env || exit 1
	config_sig="$$(sha256sum < /etc/config/engsel 2>/dev/null)" || config_sig=
	if [ -n "$${config_sig}" ]; then
		printf '%s\n' "$${config_sig}" > "$${stamp_tmp}" || exit 1
		mv "$${stamp_tmp}" /etc/engsel/.uci.sha256 || exit 1
	fi
	rm -rf /tmp/engsel-cache
	tmp=
	stamp_tmp=
	trap - 0 1 2 3 15
fi
exit 0
endef

$(eval $(call BuildPackage,engsel))
