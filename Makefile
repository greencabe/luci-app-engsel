CC ?= cc
JSONC_CFLAGS := $(shell pkg-config --cflags json-c 2>/dev/null)
JSONC_LIBS := $(shell pkg-config --libs json-c 2>/dev/null)
MBEDCRYPTO_CFLAGS := $(shell pkg-config --cflags mbedcrypto 2>/dev/null)
MBEDCRYPTO_LIBS := $(shell pkg-config --libs mbedcrypto 2>/dev/null)
ifeq ($(strip $(MBEDCRYPTO_LIBS)),)
MBEDCRYPTO_LIBS := -lmbedcrypto
endif
CFLAGS ?= -Os -std=c99 -Wall -Wextra -Wno-unused-parameter -ffunction-sections -fdata-sections
override CFLAGS += $(JSONC_CFLAGS) $(MBEDCRYPTO_CFLAGS)
LDFLAGS ?= -Wl,--gc-sections
LDLIBS ?=
ENGSEL_LIBS := $(JSONC_LIBS) $(MBEDCRYPTO_LIBS)
ifneq ($(strip $(JSONC_LIBS)),)
override CFLAGS += -DENGSEL_HAVE_JSONC
endif
BIN := engsel
SRC := $(wildcard src/*.c)
OBJ := $(SRC:.c=.o)

all: $(BIN)

$(BIN): $(OBJ)
	$(CC) $(CFLAGS) $(OBJ) $(LDFLAGS) $(LDLIBS) $(ENGSEL_LIBS) -o $@
	strip $@ 2>/dev/null || true

clean:
	rm -f $(OBJ) $(BIN)

install: $(BIN)
	install -d $(DESTDIR)/usr/bin
	install -m 0755 $(BIN) $(DESTDIR)/usr/bin/engsel

.PHONY: all clean install
